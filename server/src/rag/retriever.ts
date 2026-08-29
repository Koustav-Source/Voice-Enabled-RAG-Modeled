import { VectorStore, EmbeddingProvider, RetrievedChunk, RetrievalOptions, RetrievalResult } from "../types/rag.js";
import { tokenize, cosineSimilarity, jaccardSimilarity } from "../utils/text.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class Retriever {
  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const topK = options.topK ?? env.TOP_K;
    const minScore = options.minScore ?? env.MIN_RETRIEVAL_SCORE;
    const semanticWeight = options.semanticWeight ?? env.SEMANTIC_WEIGHT;
    const keywordWeight = options.keywordWeight ?? env.KEYWORD_WEIGHT;

    const startTotal = Date.now();
    let embeddingMs = 0;
    let searchMs = 0;
    let rerankMs = 0;

    // 1. Embed query
    const embedStart = Date.now();
    const queryEmbedding = await this.embeddingProvider.embed(query);
    embeddingMs = Date.now() - embedStart;

    // 2. Vector search
    const searchStart = Date.now();
    const vectorResults = await this.vectorStore.similaritySearch(queryEmbedding, topK * 3, 0); // over-fetch for hybrid
    searchMs = Date.now() - searchStart;

    // 3. Hybrid scoring
    const rerankStart = Date.now();
    const queryTokens = tokenize(query);
    const queryLower = query.toLowerCase();

    const scored: RetrievedChunk[] = vectorResults.map(({ chunk, score: semanticScore }) => {
      // Keyword score
      const chunkText = `${chunk.title} ${chunk.content} ${chunk.source}`.toLowerCase();
      const chunkTokens = tokenize(chunkText);
      const keywordScore = jaccardSimilarity(queryTokens, chunkTokens);

      // Exact phrase boost
      let phraseBoost = 0;
      if (queryLower.length > 3 && chunkText.includes(queryLower)) {
        phraseBoost = 0.15;
      }

      // Title boost
      let titleBoost = 0;
      const titleTokens = tokenize(chunk.title.toLowerCase());
      const titleOverlap = queryTokens.filter((t) => titleTokens.includes(t)).length;
      if (titleOverlap > 0) {
        titleBoost = (titleOverlap / queryTokens.length) * 0.2;
      }

      const combinedScore =
        semanticScore * semanticWeight +
        keywordScore * keywordWeight +
        phraseBoost +
        titleBoost;

      return {
        ...chunk,
        retrievalScore: combinedScore,
        semanticScore,
        keywordScore,
        combinedScore,
      };
    });

    // Sort by combined score
    scored.sort((a, b) => b.combinedScore - a.combinedScore);

    // Filter by minScore
    const filtered = scored.filter((c) => c.combinedScore >= minScore).slice(0, topK);

    rerankMs = Date.now() - rerankStart;

    const totalMs = Date.now() - startTotal;

    logger.debug("Retrieval completed", {
      query: query.slice(0, 100),
      topK,
      returned: filtered.length,
      embeddingMs,
      searchMs,
      rerankMs,
      totalMs,
    });

    return {
      query,
      results: filtered,
      timing: {
        embeddingMs,
        searchMs,
        rerankMs,
        totalMs,
      },
    };
  }

  /**
   * Simple query rewriting for conversational context
   * If conversation history suggests follow-up, expand query
   */
  rewriteQuery(currentQuery: string, history: { role: string; content: string }[]): string {
    if (history.length === 0) return currentQuery;

    const lastUserMessages = history
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.content);

    const lastAssistant = history.filter((m) => m.role === "assistant").slice(-1)[0]?.content || "";

    // If current query is very short and seems like follow-up (e.g., "what about south?", "which ones?")
    const isFollowUp =
      currentQuery.length < 60 &&
      /^(what about|which|how about|and|what|where|tell me more|more|that|those|these|it|the.*one)/i.test(
        currentQuery.trim()
      );

    if (isFollowUp && lastUserMessages.length > 0) {
      // Combine last topic with current query
      const prevQuery = lastUserMessages[lastUserMessages.length - 1];
      // Extract keywords from assistant response to provide context
      const keywords = lastAssistant.slice(0, 200);
      // Create expanded query: previous context + current
      return `${prevQuery} ${currentQuery}`.trim();
    }

    return currentQuery;
  }
}
