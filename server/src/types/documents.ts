import { Document, Chunk } from "./rag.js";

export interface IngestRequest {
  title: string;
  content: string;
  source?: string;
  url?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResponse {
  document: Document;
  chunks: number;
  chunkIds: string[];
}

export interface DocumentListResponse {
  documents: (Document & { chunkCount: number })[];
  total: number;
}

export interface ReindexResponse {
  reindexed: number;
  totalChunks: number;
  timingMs: number;
}

export interface DocumentStats {
  totalDocuments: number;
  totalChunks: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
}
