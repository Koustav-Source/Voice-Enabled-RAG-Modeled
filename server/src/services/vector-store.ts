import { VectorStore, Chunk, Document } from "../types/rag.js";
import { cosineSimilarity } from "../utils/text.js";
import { logger } from "../utils/logger.js";
import fs from "node:fs/promises";
import path from "node:path";

export class InMemoryVectorStore implements VectorStore {
  private chunks: Map<string, Chunk> = new Map();
  private documents: Map<string, Document> = new Map();
  private persistPath?: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath;
  }

  async addDocuments(chunks: Chunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.chunkId, chunk);
      // Ensure document exists
      if (!this.documents.has(chunk.documentId)) {
        this.documents.set(chunk.documentId, {
          id: chunk.documentId,
          title: chunk.title,
          content: "", // content stored in chunks
          source: chunk.source,
          url: chunk.url,
          category: chunk.category,
          metadata: chunk.metadata,
        });
      }
    }
    logger.info(`Added ${chunks.length} chunks to vector store`, { total: this.chunks.size });
    await this.persist();
  }

  async similaritySearch(
    queryEmbedding: number[],
    topK: number,
    minScore = 0
  ): Promise<{ chunk: Chunk; score: number }[]> {
    const results: { chunk: Chunk; score: number }[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue;
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score >= minScore) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(documentId: string): Promise<void> {
    const toDelete: string[] = [];
    for (const [chunkId, chunk] of this.chunks) {
      if (chunk.documentId === documentId) {
        toDelete.push(chunkId);
      }
    }
    for (const id of toDelete) {
      this.chunks.delete(id);
    }
    this.documents.delete(documentId);
    await this.persist();
    logger.info(`Deleted document ${documentId} and ${toDelete.length} chunks`);
  }

  async update(chunk: Chunk): Promise<void> {
    this.chunks.set(chunk.chunkId, chunk);
    await this.persist();
  }

  async healthCheck(): Promise<{ status: "healthy" | "unhealthy"; count: number }> {
    return {
      status: "healthy",
      count: this.chunks.size,
    };
  }

  async getAllChunks(): Promise<Chunk[]> {
    return Array.from(this.chunks.values());
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async load(): Promise<void> {
    if (!this.persistPath) return;
    try {
      const data = await fs.readFile(this.persistPath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.chunks) {
        for (const chunk of parsed.chunks) {
          this.chunks.set(chunk.chunkId, chunk);
        }
      }
      if (parsed.documents) {
        for (const doc of parsed.documents) {
          this.documents.set(doc.id, doc);
        }
      }
      logger.info(`Loaded ${this.chunks.size} chunks from persistence`);
    } catch (err) {
      logger.warn("No existing vector store persistence found, starting fresh");
    }
  }

  private async persist(): Promise<void> {
    if (!this.persistPath) return;
    try {
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });
      const data = {
        chunks: Array.from(this.chunks.values()),
        documents: Array.from(this.documents.values()),
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      logger.error("Failed to persist vector store", { error: String(err) });
    }
  }

  // For testing and direct access
  clear(): void {
    this.chunks.clear();
    this.documents.clear();
  }

  count(): number {
    return this.chunks.size;
  }
}
