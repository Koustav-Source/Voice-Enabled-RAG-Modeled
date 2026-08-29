# Production-grade Voice RAG Transformation

Transforms prototype `hacker-house-goa-rag` into production-grade Voice + RAG platform with 28 chunks, green theme, greeting handler, and Vercel fix.

## Critical Bug Fixes

- **content vs text bug**: `knowledge.json` uses `content` but `buildContext()` used `chunk.text` → empty context. Fixed in `DocumentRepository.loadSeed()` and `IngestionService.normalizeLegacyKnowledge()` to handle both fields.
- **Fake confidence**: Removed `0.55 + score/10` → now real `retrievalScore` = cosine + keyword fusion, documented as similarity.
- **Fake timers**: Removed `setTimeout` pipeline simulation → real API lifecycle events drive PipelineStatus.
- **Low relevance**: Added filtering `maxScore<0.22 && maxKeyword<0.03 → no results` to prevent weak context reaching LLM.

## RAG Pipeline (Real)

- **Chunker**: configurable size/overlap/min, sentence-boundary aware, metadata preservation, traceable chunkId/documentId
- **Embeddings**: Local hashed TF-IDF 384d L2 normalized + Gemini `text-embedding-004` fallback via OpenAI-compatible API
- **VectorStore**: InMemory with cosine similarity, persistence to JSON, interface ready for pgvector/Pinecone/Qdrant
- **Hybrid search**: semantic 0.7 + keyword 0.3 + phrase boost + title boost
- **Reranker**: heuristic (length penalty, term proximity, category boost)
- **Context Builder**: 9000 chars max, truncation, stats
- **Prompt Builder**: grounded, injection-resistant, cites sources

## Knowledge Base: 8 → 28 docs

- Beaches (10): Baga, Anjuna, Calangute, Palolem, Vagator, Morjim, Arambol, Colva, Benaulim, Agonda
- History (5): Fort Aguada, Chapora Fort, Basilica Bom Jesus, Se Cathedral, Old Goa Churches
- Nature (2): Dudhsagar Falls, Spice Plantations
- Culture (3): Goan cuisine, nightlife, culture/festivals/shopping
- Travel (3): best time, transport, etc
- General (3): Goa, North Goa, South Goa
- Events (1): Hacker House Goa 28-31 Oct 2026
- Enriched content with real URLs

## Greeting & Small-Talk Handler (Fix for "Hii")

Previously: `Hii` → low relevance → cold "insufficient information"
Now:
- Detects greetings: hi, hii, hello, hey, good morning, namaste, etc.
- Detects small-talk: how are you, who are you, what can you do, thanks, bye
- Returns friendly welcome with capabilities list, example questions, mic hint
- `grounded: false` but helpful, not error

Tested:
- `Hii` → Welcome message with beach/history/nature/culture/travel lists
- `how are you` → Friendly + explanation
- `who are you` → Voice RAG pipeline explanation

## Voice Pipeline

- STT: Browser SpeechRecognition (en-IN) + AnalyserNode visualization + transcript editable before send
- TTS: Browser SpeechSynthesis with cancel previous, play/pause/stop
- Provider abstractions: `SpeechToTextProvider`, `TextToSpeechProvider` ready for Whisper + ElevenLabs
- Explicit VoiceState enum: idle | listening | transcribing | retrieving | generating | speaking | error

## Frontend: Forest Green Hacker House Theme Restored

- Header: #043d2c forest green with #ffd21c yellow border, palm icon, sun
- Background: ivory #f6f1e7 with subtle forest pattern + yellow/green blur orbs
- Cards: forest gradient #063d2c → #042e22 with yellow accents
- Pipeline: yellow active, green done, real timing
- ChatWindow empty state: VOICE-ENABLED RAG MODEL green/red, yellow pill, 4 example queries
- MessageBubble: forest green user, white assistant with forest/gold badges
- Composer: forest green send, yellow transcript preview, green grounded badge
- Footer: forest green with yellow top border
- Responsive, accessible, no neon, no 3D

## Backend: TypeScript Modular

- config/env.ts: zod validation, fails fast
- routes: chat, voice, documents, health
- controllers: chat, voice, documents
- services: rag.service, vector-store, llm.service (Gemini/OpenAI/Mock), ingestion
- rag/: chunker, embeddings, retriever, reranker, context-builder, prompt-builder
- repositories: document, conversation (sessionId, history, query rewriting)
- middleware: error-handler, request-id, rate-limit, validation
- Security: helmet, CORS, rate-limit 60/min, safe errors, no keys in frontend

## Deployment Fix for Vercel

Added:
- `vercel.json` at root (frontend Vite, output client/dist, SPA rewrite)
- `client/vercel.json` (SPA)
- `api/index.ts` serverless entry for full-stack Vercel option
- `.vercelignore`
- `trustedDependencies: ["esbuild"]` in client/package.json to fix allow-scripts warning
- `vercel-build` script in root
- `DEPLOYMENT.md` with full guide: auto-edit workflow (git push → GitHub → Vercel webhook), Root Directory = client, clear build cache, split vs unified deployment

The log you saw:
```
Restored build cache
npm warn allow-scripts esbuild...
```
Is normal — cache is good, warning is not fatal. Fix is to set Root Directory to `client` and redeploy without cache.

## Tests

11 tests passing:
- Chunker: small doc single chunk, large doc overlap, metadata preservation, empty
- Retriever: exact keyword (Baga top), semantic-like (quiet → South Goa), irrelevant low scores, topK, query rewriting
- Context Builder: char limit, metadata

## Validation Checklist

- [x] npm install succeeds
- [x] build succeeds (client 194kB JS + server)
- [x] /api/health → 28 docs, 28 chunks, 8 categories
- [x] Hii → friendly welcome, not insufficient info
- [x] Baga Beach → grounded true, sources 0.4-0.6, timing
- [x] quantum physics → grounded false, 0 sources, honest message
- [x] Follow-up "Which ones are quieter?" → query rewriting → Palolem/South Goa
- [x] Voice input → transcript editable → RAG → TTS
- [x] Green theme restored (forest #063d2c, yellow #ffd21c, red #ef3e32)
- [x] No fake timers, no fake confidence, no fake features
- [x] Mobile responsive

## How to Test

```bash
rm -rf server/data
npm run build
PORT=3000 npm start --workspace=server
# http://localhost:3000
# Try: Hii, What is Baga Beach known for?, quantum physics, Which beaches are quieter?
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"Hii"}'
```

## Architecture

See README.md for full architecture diagram, RAG pipeline, voice pipeline, API docs, folder structure, env vars, troubleshooting, future scaling to pgvector/Redis/Whisper/TTS.
