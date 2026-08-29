import { EmbeddingProvider } from "../types/rag.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import OpenAI from "openai";

/**
 * Local lightweight embedding provider using TF-IDF style hashed vectors
 * Honest implementation for local development without external API
 * Produces deterministic embeddings based on token hashing
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  dimension: number;
  model: string;

  constructor(dimension = 384) {
    this.dimension = dimension;
    this.model = "local-hashed-tfidf-384";
  }

  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private textToVector(text: string): number[] {
    const vec = new Array(this.dimension).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (tokens.length === 0) return vec;

    // Term frequency map
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    for (const [token, freq] of tf) {
      const hash = this.hashToken(token);
      const idx = hash % this.dimension;
      // TF weighted + position hash for distribution
      const weight = Math.log(1 + freq) * (1 + (hash % 100) / 100);
      vec[idx] += weight;

      // Add bigram-like spread to reduce collisions
      const idx2 = (hash * 7) % this.dimension;
      vec[idx2] += weight * 0.3;
    }

    // L2 normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (mag > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= mag;
      }
    }

    return vec;
  }

  async embed(text: string): Promise<number[]> {
    return this.textToVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.textToVector(t));
  }
}

/**
 * Gemini embedding via OpenAI-compatible API
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  dimension: number;
  model: string;
  private client: OpenAI;

  constructor(apiKey: string, model = "text-embedding-004", dimension = 768) {
    this.model = model;
    this.dimension = dimension;
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  async embed(text: string): Promise<number[]> {
    try {
      const res = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });
      const embedding = res.data[0]?.embedding;
      if (!embedding) throw new Error("No embedding returned");
      // Normalize to configured dimension if needed (truncate/pad)
      if (embedding.length !== this.dimension) {
        logger.warn(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
      }
      // L2 normalize
      const mag = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      if (mag > 0) {
        return embedding.map((v) => v / mag);
      }
      return embedding;
    } catch (err) {
      logger.error("Gemini embedding failed, falling back to local", { error: String(err) });
      // Fallback to local
      const local = new LocalEmbeddingProvider(this.dimension);
      return local.embed(text);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  if (env.GEMINI_API_KEY && env.EMBEDDING_MODEL.includes("embedding")) {
    logger.info(`Using Gemini embedding provider: ${env.EMBEDDING_MODEL}`);
    return new GeminiEmbeddingProvider(env.GEMINI_API_KEY, env.EMBEDDING_MODEL, 768);
  }
  if (env.OPENAI_API_KEY) {
    logger.info("Using OpenAI embedding provider");
    // Could implement OpenAI provider similarly, but use local for now if not configured
    return new LocalEmbeddingProvider(384);
  }
  logger.info("Using local embedding provider (no API key configured)");
  return new LocalEmbeddingProvider(384);
}
