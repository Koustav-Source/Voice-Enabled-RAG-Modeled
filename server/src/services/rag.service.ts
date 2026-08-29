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

  private isGreeting(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    const greetings = [
      "hi", "hii", "hiii", "hello", "hey", "heyy", "helo", "hola",
      "good morning", "good afternoon", "good evening", "good night",
      "greetings", "howdy", "yo", "sup", "what's up", "whats up",
      "namaste", "namaskar", "kem cho", "kaisa hai"
    ];
    // Exact match or short greeting with punctuation
    if (normalized.length <= 20) {
      const clean = normalized.replace(/[!.,?]+/g, "").trim();
      if (greetings.includes(clean)) return true;
      if (/^(hi+|he+y+|hello+|hey+|hola+)[!.,?]*$/.test(clean)) return true;
    }
    // Starts with greeting
    if (/^(hi+|hello|hey|good morning|good afternoon|good evening|namaste)\b/.test(normalized)) {
      // If it's just greeting + optional name, not a full question
      if (normalized.length < 30 && !normalized.includes("?") && normalized.split(" ").length <= 4) {
        return true;
      }
    }
    return false;
  }

  private isSmallTalk(text: string): { isSmallTalk: boolean; intent: string } {
    const normalized = text.toLowerCase().trim();
    
    if (/^(how are you|how r u|how are u|how are you doing|how's it going|hows it going|kaise ho|kya haal)/.test(normalized)) {
      return { isSmallTalk: true, intent: "how_are_you" };
    }
    if (/^(who are you|what are you|what is your name|who is this|tell me about yourself|what can you do|what do you do|help|what can you help|capabilities)/.test(normalized)) {
      return { isSmallTalk: true, intent: "about" };
    }
    if (/^(thanks|thank you|thankyou|thx|thanks a lot|dhanyavad|shukriya)/.test(normalized)) {
      return { isSmallTalk: true, intent: "thanks" };
    }
    if (/^(bye|goodbye|see you|see ya|take care|alvida|chalte hai)/.test(normalized)) {
      return { isSmallTalk: true, intent: "bye" };
    }
    return { isSmallTalk: false, intent: "" };
  }

  private getGreetingResponse(): string {
    return `Hii! 👋 Welcome to Voice RAG — your grounded Goa assistant! 🌴

I'm here to help you explore Goa with real, cited knowledge. I can answer about:

🏖️ **Beaches** — Baga, Anjuna, Calangute, Palolem, Vagator, Morjim, Arambol, Colva, Benaulim, Agonda
🏰 **History** — Fort Aguada, Chapora Fort, Basilica of Bom Jesus, Se Cathedral, Old Goa
🌿 **Nature** — Dudhsagar Falls, Spice Plantations
🍛 **Culture** — Goan cuisine, nightlife, festivals, shopping
🗺️ **Travel** — Best time to visit, transportation, North vs South Goa
💻 **Hacker House Goa** — 28-31 Oct 2026 event info

Try asking:
• "What is Baga Beach known for?"
• "Which beaches are quieter?"
• "Tell me about South Goa vs North Goa"
• "What is Goan cuisine famous for?"

You can **type** or **click the mic 🎙️ to speak** — I'll retrieve grounded knowledge and read the answer aloud!

What would you like to know about Goa?`;
  }

  private getSmallTalkResponse(intent: string): string {
    switch (intent) {
      case "how_are_you":
        return `I'm doing great, thanks for asking! 😊 Ready to help you explore Goa.

I'm a Voice-Enabled RAG assistant — I retrieve real knowledge about Goa's beaches, forts, culture, and travel, then generate grounded answers with sources.

What would you like to know? Try "What are the quietest beaches in South Goa?" or click the mic 🎙️ to speak!`;
      case "about":
        return `I'm **Voice RAG Assistant** for Hacker House Goa 🌴 — a production-grade grounded AI.

**What I do:**
🎙️ Voice Input → Speech-to-Text → Query Understanding → Hybrid Retrieval (semantic + keyword) → Grounded Generation → Sources + TTS

**I can help with:**
• Goa beaches, forts, churches, waterfalls, food, nightlife, shopping, transport
• North vs South Goa comparisons
• Travel tips, best time to visit, water sports

**My knowledge base has 28 documents, 28 chunks** covering beaches, history, nature, culture, travel, and the Hacker House Goa event (28-31 Oct 2026).

**How I work:**
• Real retrieval scores, not fake confidence
• Sources cited with relevance
• Conversation memory for follow-ups
• No hallucinations — if I don't know, I say so

Ask me anything about Goa, or say "What can you do?" again for examples!`;
      case "thanks":
        return `You're welcome! 🙏 Happy to help!

If you want to explore more, try:
• "What is Palolem Beach famous for?"
• "Tell me about Goan cuisine"
• "What is Dudhsagar Falls?"

Or click the mic 🎙️ to ask by voice — I'll read the answer aloud!`;
      case "bye":
        return `Goodbye! 👋 Thanks for chatting about Goa!

Come back anytime you want to know about:
🏖️ Beaches • 🏰 Forts • 🍛 Food • 🌿 Nature • 🗺️ Travel

Have a great day — and if you're in Goa, enjoy the susegad life! 🌴✨`;
      default:
        return this.getGreetingResponse();
    }
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

    const trimmedQuestion = question.trim();
    
    // Handle greetings and small talk gracefully — don't treat as failed RAG
    if (this.isGreeting(trimmedQuestion)) {
      logger.info("Greeting detected", { question: trimmedQuestion });
      return {
        answer: this.getGreetingResponse(),
        grounded: false,
        sources: [],
        retrieval: {
          query: question,
          topK,
          returned: 0,
          results: [],
        },
        timing: {
          retrievalMs: 0,
          generationMs: 1,
          totalMs: 1,
        },
      };
    }

    const smallTalk = this.isSmallTalk(trimmedQuestion);
    if (smallTalk.isSmallTalk) {
      logger.info("Small talk detected", { question: trimmedQuestion, intent: smallTalk.intent });
      return {
        answer: this.getSmallTalkResponse(smallTalk.intent),
        grounded: false,
        sources: [],
        retrieval: {
          query: question,
          topK,
          returned: 0,
          results: [],
        },
        timing: {
          retrievalMs: 0,
          generationMs: 1,
          totalMs: 1,
        },
      };
    }

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
