import { VectorStore, EmbeddingProvider, LLMProvider, RAGResponse, Source } from "../types/rag.js";
import { Retriever } from "../rag/retriever.js";
import { Reranker } from "../rag/reranker.js";
import { ContextBuilder } from "../rag/context-builder.js";
import { PromptBuilder } from "../rag/prompt-builder.js";
import { ChatMessage } from "../types/chat.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class RAGService {
  private retriever: Retriever;
  private reranker: Reranker;
  private contextBuilder: ContextBuilder;
  private promptBuilder: PromptBuilder;

  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider,
    private llmProvider: LLMProvider
  ) {
    this.retriever = new Retriever(vectorStore, embeddingProvider);
    this.reranker = new Reranker();
    this.contextBuilder = new ContextBuilder({ maxChars: env.MAX_CONTEXT_CHARS });
    this.promptBuilder = new PromptBuilder({ maxHistoryMessages: 6 });
  }

  async query(
    question: string,
    options: {
      topK?: number;
      minScore?: number;
      conversationHistory?: ChatMessage[];
      sessionId?: string;
    } = {}
  ): Promise<RAGResponse> {
    const totalStart = Date.now();
    const topK = options.topK ?? env.TOP_K;
    const minScore = options.minScore ?? env.MIN_RETRIEVAL_SCORE;

    // 1. Query rewriting for conversational context
    const rewrittenQuery = this.retriever.rewriteQuery(question, options.conversationHistory || []);
    const retrievalQuery = rewrittenQuery !== question ? rewrittenQuery : question;

    logger.debug("RAG query", { question, rewrittenQuery, retrievalQuery });

    // 2. Retrieval
    const retrievalResult = await this.retriever.retrieve(retrievalQuery, {
      topK,
      minScore,
    });

    // 3. Reranking
    const rerankStart = Date.now();
    let reranked = this.reranker.rerank(retrievalQuery, retrievalResult.results, {
      topK,
      minScore,
    });
    const rerankMs = Date.now() - rerankStart;

    // Low relevance filtering: prevent weak context from reaching LLM
    // For local hashed embeddings, scores are lower, so we need nuanced logic
    const maxScore = reranked.length > 0 ? Math.max(...reranked.map(r => r.combinedScore)) : 0;
    const maxKeyword = reranked.length > 0 ? Math.max(...reranked.map(r => r.keywordScore)) : 0;
    const avgKeywordScore = reranked.length > 0 ? reranked.reduce((sum, r) => sum + r.keywordScore, 0) / reranked.length : 0;
    
    // Irrelevant if BOTH semantic and keyword signals are very low
    // This allows "quieter beaches" (low semantic but decent keyword) to pass
    // But filters "quantum physics" (low semantic + zero keyword)
    const RELEVANCE_THRESHOLD = 0.22;
    const KEYWORD_THRESHOLD = 0.03;
    const isIrrelevant = maxScore < RELEVANCE_THRESHOLD && maxKeyword < KEYWORD_THRESHOLD;
    
    if (isIrrelevant) {
      logger.info(`Low relevance detected (maxScore ${maxScore.toFixed(3)} < ${RELEVANCE_THRESHOLD} AND maxKeyword ${maxKeyword.toFixed(3)} < ${KEYWORD_THRESHOLD}), treating as no results`, {
        query: question.slice(0, 80),
        maxScore,
        maxKeyword,
        avgKeywordScore,
      });
      reranked = [];
    }

    // Update timing
    const retrievalWithRerank = {
      ...retrievalResult,
      results: reranked,
      timing: {
        ...retrievalResult.timing,
        rerankMs,
        totalMs: retrievalResult.timing.totalMs + rerankMs,
      },
    };

    // 4. Context building
    const contextResult = this.contextBuilder.buildWithStats(reranked);

    // 5. Prompt building
    const { systemPrompt, userPrompt } = this.promptBuilder.buildFullPrompt(
      question,
      reranked,
      contextResult.context,
      options.conversationHistory || [],
      rewrittenQuery !== question ? rewrittenQuery : undefined
    );

    // 6. Generation
    const genStart = Date.now();
    let answer: string;
    let grounded = reranked.length > 0;

    try {
      answer = await this.llmProvider.generate(userPrompt, {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });
      // If no context, ensure grounded false
      if (reranked.length === 0) {
        grounded = false;
      }
    } catch (err: any) {
      logger.error("LLM generation failed", { error: err.message });
      // Fallback to grounded template if LLM fails but we have retrieval
      if (reranked.length > 0) {
        answer = this.fallbackAnswer(question, reranked);
        grounded = true;
      } else {
        // No retrieval + LLM failure = clear message
        answer = "The AI generation service is unavailable and no relevant knowledge was found. The knowledge retrieval layer is still operational, but I couldn't find sufficient information to answer your question.";
        grounded = false;
      }
    }

    const generationMs = Date.now() - genStart;
    const totalMs = Date.now() - totalStart;

    // 7. Sources with proper retrieval scores (not fake confidence)
    const sources: Source[] = reranked.map((chunk, idx) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      title: chunk.title,
      source: chunk.source,
      url: chunk.url,
      category: chunk.category,
      retrievalScore: Number(chunk.retrievalScore.toFixed(3)),
      position: chunk.position,
    }));

    logger.info("RAG query completed", {
      question: question.slice(0, 100),
      grounded,
      sources: sources.length,
      retrievalMs: retrievalWithRerank.timing.totalMs,
      generationMs,
      totalMs,
    });

    return {
      answer,
      grounded,
      sources,
      retrieval: {
        query: question,
        rewrittenQuery: rewrittenQuery !== question ? rewrittenQuery : undefined,
        topK,
        returned: reranked.length,
        results: reranked,
      },
      timing: {
        retrievalMs: retrievalWithRerank.timing.totalMs,
        generationMs,
        totalMs,
      },
    };
  }

  private fallbackAnswer(question: string, chunks: any[]): string {
    if (chunks.length === 0) {
      return "I couldn't find sufficient information in the connected knowledge base to answer that reliably. The current knowledge base contains information about Baga Beach, Anjuna Beach, Calangute Beach, Fort Aguada, Chapora Fort, and general North/South Goa.";
    }

    const topChunks = chunks.slice(0, 2);
    const combined = topChunks.map((c: any) => c.content).join(" ");

    return `Based on the retrieved information from the knowledge base:\n\n${combined}\n\nThis information is grounded in ${topChunks.length} source(s) from the connected knowledge base.`;
  }

  // For health checks
  async healthCheck() {
    const vectorHealth = await this.vectorStore.healthCheck();
    return {
      vectorStore: vectorHealth,
      llm: {
        configured: this.llmProvider.isConfigured(),
        model: this.llmProvider.model,
      },
      embedding: {
        model: this.embeddingProvider.model,
        dimension: this.embeddingProvider.dimension,
      },
    };
  }
}
