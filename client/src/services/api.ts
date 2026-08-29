import { ChatResponse } from '../types/chat';

// Support external backend URL via env var (for Vercel frontend + Render backend split)
// If VITE_API_URL is set, use it as base (e.g., https://your-backend.onrender.com)
// Otherwise use relative /api (works when backend serves frontend, like localhost:3000)
const ENV_API_URL = (import.meta as any).env?.VITE_API_URL || '';
const API_BASE = ENV_API_URL ? `${ENV_API_URL.replace(/\/$/, '')}/api` : '/api';

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
    let text = '';
    try {
      text = await res.text();
      body = JSON.parse(text);
    } catch {
      // If response is HTML (e.g., index.html from SPA rewrite), we get 405 or 200 with HTML
      // This happens on Vercel when /api is rewritten to /index.html
      if (res.status === 405 || text.includes('<!DOCTYPE html>')) {
        throw new ApiError(
          `API not available (HTTP ${res.status}). This happens when frontend is deployed on Vercel without backend. Please deploy backend to Render/Railway and set VITE_API_URL env var to your backend URL, or deploy full-stack with server serving frontend. See DEPLOYMENT.md`,
          res.status,
          'API_NOT_CONFIGURED',
          requestId
        );
      }
    }
    
    // Handle 405 specifically - Method Not Allowed, usually from static file serving
    if (res.status === 405) {
      throw new ApiError(
        `Request failed with 405 - API endpoint not configured. If you're on Vercel frontend-only deployment, you need to deploy backend separately to Render and set VITE_API_URL. For local dev, ensure backend is running on port 3000. See DEPLOYMENT.md`,
        405,
        'METHOD_NOT_ALLOWED',
        requestId
      );
    }

    throw new ApiError(
      body.message || body.error || `Request failed with ${res.status}`,
      res.status,
      body.error,
      body.requestId || requestId
    );
  }

  // Try to parse JSON, but handle case where HTML is returned
  try {
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>')) {
      throw new Error('Received HTML instead of JSON - API not configured');
    }
    return JSON.parse(text);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    // If we already consumed body, try json()
    try {
      return await (res as any).json();
    } catch {
      throw new ApiError(
        `Invalid API response: ${err.message}. API might not be configured. Check DEPLOYMENT.md`,
        500,
        'INVALID_RESPONSE',
        requestId
      );
    }
  }
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

  getApiBase(): string {
    return API_BASE;
  },

  isExternalBackend(): boolean {
    return !!ENV_API_URL;
  }
};
