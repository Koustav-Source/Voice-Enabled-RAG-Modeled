import { v4 as uuidv4 } from "uuid";
import { Document, Chunk, EmbeddingProvider, VectorStore } from "../types/rag.js";
import { Chunker } from "../rag/chunker.js";
import { logger } from "../utils/logger.js";
import { cleanText } from "../utils/text.js";

export class IngestionService {
  private chunker: Chunker;

  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider,
    chunkerOptions?: { chunkSize: number; overlap: number }
  ) {
    this.chunker = new Chunker({
      chunkSize: chunkerOptions?.chunkSize ?? 800,
      overlap: chunkerOptions?.overlap ?? 150,
      minChunkSize: 100,
    });
  }

  async ingestDocument(raw: {
    title: string;
    content: string;
    source?: string;
    url?: string;
    category?: string;
    metadata?: Record<string, unknown>;
    id?: string;
  }): Promise<{ document: Document; chunks: Chunk[] }> {
    const doc: Document = {
      id: raw.id || uuidv4(),
      title: cleanText(raw.title),
      content: cleanText(raw.content),
      source: raw.source || "Unknown",
      url: raw.url,
      category: raw.category || "general",
      metadata: raw.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!doc.title || !doc.content) {
      throw new Error("Document title and content are required");
    }

    // Chunk
    const chunks = this.chunker.chunkDocument(doc);

    if (chunks.length === 0) {
      throw new Error("Document produced no chunks (content too short or empty)");
    }

    // Embed
    const texts = chunks.map((c) => `${c.title} ${c.content}`);
    const embeddings = await this.embeddingProvider.embedBatch(texts);

    const embeddedChunks = chunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx],
    }));

    // Store
    await this.vectorStore.addDocuments(embeddedChunks);

    logger.info(`Ingested document ${doc.id} with ${embeddedChunks.length} chunks`, {
      title: doc.title,
      category: doc.category,
    });

    return { document: doc, chunks: embeddedChunks };
  }

  async ingestDocuments(
    raws: {
      title: string;
      content: string;
      source?: string;
      url?: string;
      category?: string;
      metadata?: Record<string, unknown>;
      id?: string;
    }[]
  ): Promise<{ documents: Document[]; totalChunks: number }> {
    const documents: Document[] = [];
    let totalChunks = 0;

    for (const raw of raws) {
      const { document, chunks } = await this.ingestDocument(raw);
      documents.push(document);
      totalChunks += chunks.length;
    }

    return { documents, totalChunks };
  }

  async reindexAll(documents: Document[]): Promise<{ reindexed: number; totalChunks: number }> {
    // Clear existing (if in-memory, we need to handle)
    // For simplicity, we don't clear here; caller should clear if needed
    // Instead, we re-embed all
    const allChunks: Chunk[] = [];
    for (const doc of documents) {
      const chunks = this.chunker.chunkDocument(doc);
      allChunks.push(...chunks);
    }

    const texts = allChunks.map((c) => `${c.title} ${c.content}`);
    const embeddings = await this.embeddingProvider.embedBatch(texts);

    const embedded = allChunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx],
    }));

    await this.vectorStore.addDocuments(embedded);

    logger.info(`Reindexed ${documents.length} documents into ${embedded.length} chunks`);

    return { reindexed: documents.length, totalChunks: embedded.length };
  }

  normalizeLegacyKnowledge(legacy: any[]): Document[] {
    // Fix the bug: legacy uses content field, not text
    return legacy.map((item, idx) => {
      // Handle both old buggy format and new
      const content = item.content || item.text || "";
      const title = item.title || `Document ${idx + 1}`;
      const source = item.source || "Goa Tourism";
      const url = item.url || undefined;
      const category = item.category || "general";

      return {
        id: item.id || `doc_${idx}_${title.toLowerCase().replace(/\s+/g, "_")}`,
        title,
        content,
        source,
        url: url || undefined,
        category,
        metadata: {
          legacyIndex: idx,
          normalized: true,
          ...(item.metadata || {}),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }
}
