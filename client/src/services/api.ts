import { ChatResponse } from '../types/chat';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const requestId = res.headers.get('X-Request-Id') || undefined;
  
  if (!res.ok) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {}
    
    throw new ApiError(
      body.message || body.error || `Request failed with ${res.status}`,
      res.status,
      body.error,
      body.requestId || requestId
    );
  }

  return res.json();
}

export const api = {
  async chat(message: string, sessionId?: string, topK?: number, includeDebug = false): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, topK, includeDebug }),
    });
    return handleResponse<ChatResponse>(res);
  },

  async voiceTranscribe(transcript: string, sessionId?: string) {
    const res = await fetch(`${API_BASE}/voice/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, sessionId }),
    });
    return handleResponse(res);
  },

  async health() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async config() {
    const res = await fetch(`${API_BASE}/config`);
    return handleResponse(res);
  },

  async documents() {
    const res = await fetch(`${API_BASE}/documents`);
    return handleResponse(res);
  },

  async documentStats() {
    const res = await fetch(`${API_BASE}/documents/stats`);
    return handleResponse(res);
  },

  async createDocument(doc: { title: string; content: string; source?: string; url?: string; category?: string }) {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    return handleResponse(res);
  },

  async deleteDocument(id: string) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async reindex() {
    const res = await fetch(`${API_BASE}/documents/reindex`, {
      method: 'POST',
    });
    return handleResponse(res);
  },
};
