import { Source, RetrievedChunk } from "./rag.js";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  sources?: Source[];
  retrievalScore?: number;
}

export interface Conversation {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  topK?: number;
  includeDebug?: boolean;
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
    promptLength: number;
  };
}

export interface VoiceTranscribeRequest {
  audio?: string; // base64 or URL - for future server STT
  transcript: string; // browser transcript fallback
}

export type VoiceState =
  | "idle"
  | "listening"
  | "transcribing"
  | "retrieving"
  | "generating"
  | "speaking"
  | "error";
