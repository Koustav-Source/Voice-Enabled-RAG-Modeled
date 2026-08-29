export interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  category: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chunk {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  category: string;
  position: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  tokenCount?: number;
}

export interface RetrievedChunk extends Chunk {
  retrievalScore: number;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  semanticWeight?: number;
  keywordWeight?: number;
  includeEmbeddings?: boolean;
}

export interface RetrievalResult {
  query: string;
  rewrittenQuery?: string;
  results: RetrievedChunk[];
  timing: {
    embeddingMs: number;
    searchMs: number;
    rerankMs: number;
    totalMs: number;
  };
}

export interface VectorStore {
  addDocuments(chunks: Chunk[]): Promise<void>;
  similaritySearch(queryEmbedding: number[], topK: number, minScore?: number): Promise<{ chunk: Chunk; score: number }[]>;
  delete(documentId: string): Promise<void>;
  update(chunk: Chunk): Promise<void>;
  healthCheck(): Promise<{ status: "healthy" | "unhealthy"; count: number }>;
  getAllChunks(): Promise<Chunk[]>;
  getDocuments(): Promise<Document[]>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimension: number;
  model: string;
}

export interface LLMProvider {
  generate(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<string>;
  stream?(prompt: string, options?: { systemPrompt?: string }): AsyncGenerator<string>;
  model: string;
  isConfigured(): boolean;
}

export interface RAGOptions {
  topK?: number;
  minScore?: number;
  maxContextChars?: number;
  includeSources?: boolean;
}

export interface RAGResponse {
  answer: string;
  grounded: boolean;
  sources: Source[];
  retrieval: {
    query: string;
    rewrittenQuery?: string;
    topK: number;
    returned: number;
    results: RetrievedChunk[];
  };
  timing: {
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
}

export interface Source {
  chunkId: string;
  documentId: string;
  title: string;
  source: string;
  url?: string;
  category?: string;
  retrievalScore: number;
  position?: number;
}
