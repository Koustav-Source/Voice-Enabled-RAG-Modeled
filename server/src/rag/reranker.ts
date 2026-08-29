import { RetrievedChunk } from "../types/rag.js";
import { tokenize } from "../utils/text.js";

export interface RerankerOptions {
  topK: number;
  minScore?: number;
}

/**
 * Simple reranker that applies additional heuristics
 * In production, this could call a cross-encoder model
 */
export class Reranker {
  rerank(query: string, chunks: RetrievedChunk[], options: RerankerOptions): RetrievedChunk[] {
    const queryTokens = tokenize(query);
    const queryLower = query.toLowerCase();

    const reranked = chunks.map((chunk) => {
      let score = chunk.combinedScore;

      // Penalize very short chunks unless highly relevant
      if (chunk.content.length < 50) {
        score *= 0.8;
      }

      // Boost chunks where query terms appear close together
      const contentLower = chunk.content.toLowerCase();
      const positions: number[] = [];
      for (const token of queryTokens) {
        const idx = contentLower.indexOf(token);
        if (idx !== -1) positions.push(idx);
      }
      if (positions.length >= 2) {
        const spread = Math.max(...positions) - Math.min(...positions);
        if (spread < 200) {
          score += 0.05; // terms close together = more relevant
        }
      }

      // Category boost if query mentions category-like terms
      if (queryLower.includes(chunk.category.toLowerCase())) {
        score += 0.08;
      }

      // Source authority (could be configurable)
      // Goa Tourism gets slight boost as primary source in this dataset
      if (chunk.source.toLowerCase().includes("goa tourism")) {
        score += 0.02;
      }

      return {
        ...chunk,
        retrievalScore: score,
        combinedScore: score,
      };
    });

    // Sort again
    reranked.sort((a, b) => b.combinedScore - a.combinedScore);

    let filtered = reranked;
    if (options.minScore !== undefined) {
      filtered = reranked.filter((c) => c.combinedScore >= options.minScore!);
    }

    return filtered.slice(0, options.topK);
  }
}
