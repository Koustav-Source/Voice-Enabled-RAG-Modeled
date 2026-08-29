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

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  category: string;
  position: number;
  retrievalScore: number;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
  retrieval?: {
    query: string;
    rewrittenQuery?: string;
    topK: number;
    returned: number;
  };
  timing?: {
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
  grounded?: boolean;
}

export interface ChatResponse {
  requestId: string;
  sessionId: string;
  answer: string;
  grounded: boolean;
  sources: Source[];
  retrieval: {
    query: string;
    rewrittenQuery?: string;
    topK: number;
    returned: number;
  };
  timing: {
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
  conversation: {
    messageCount: number;
  };
  debug?: {
    retrievedChunks: RetrievedChunk[];
    contextLength: number;
  };
}

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'retrieving'
  | 'generating'
  | 'speaking'
  | 'error';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  durationMs?: number;
  description?: string;
}
