import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { rateLimit } from "./middleware/rate-limit.js";

import { InMemoryVectorStore } from "./services/vector-store.js";
import { createEmbeddingProvider } from "./rag/embeddings.js";
import { createLLMProvider } from "./services/llm.service.js";
import { RAGService } from "./services/rag.service.js";
import { IngestionService } from "./services/ingestion.service.js";
import { DocumentRepository } from "./repositories/document.repository.js";
import { ConversationRepository } from "./repositories/conversation.repository.js";

import { ChatController } from "./controllers/chat.controller.js";
import { VoiceController } from "./controllers/voice.controller.js";
import { DocumentsController } from "./controllers/documents.controller.js";

import { createChatRoutes } from "./routes/chat.routes.js";
import { createVoiceRoutes } from "./routes/voice.routes.js";
import { createDocumentRoutes } from "./routes/documents.routes.js";
import { createHealthRoutes } from "./routes/health.routes.js";

import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();

  // Security & middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow frontend
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);
  app.use(rateLimit({ windowMs: 60_000, max: 60 }));

  // Logging middleware
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      requestId: (req as any).requestId,
      ip: req.ip,
    });
    next();
  });

  // Initialize core services
  const vectorStore = new InMemoryVectorStore(
    path.join(__dirname, "../data/vector-store.json")
  );
  await vectorStore.load();

  const embeddingProvider = createEmbeddingProvider();
  const llmProvider = createLLMProvider();

  const ragService = new RAGService(vectorStore, embeddingProvider, llmProvider);
  const ingestionService = new IngestionService(vectorStore, embeddingProvider, {
    chunkSize: env.CHUNK_SIZE,
    overlap: env.CHUNK_OVERLAP,
  });

  const docRepo = new DocumentRepository(
    path.join(__dirname, "../data/documents.json")
  );
  const conversationRepo = new ConversationRepository();

  // Load seed data if vector store empty
  const existingChunks = await vectorStore.getAllChunks();
  if (existingChunks.length === 0) {
    logger.info("Vector store empty, loading seed data...");
    const seedPaths = [
      path.join(__dirname, "../../public/data/knowledge.json"),
      path.join(__dirname, "../../data/seed/knowledge.json"),
      path.join(__dirname, "../data/seed/knowledge.json"),
      path.join(process.cwd(), "public/data/knowledge.json"),
      path.join(process.cwd(), "data/seed/knowledge.json"),
    ];

    let seedLoaded = false;
    for (const seedPath of seedPaths) {
      try {
        const docs = await docRepo.loadSeed(seedPath);
        if (docs.length > 0) {
          const result = await ingestionService.reindexAll(docs);
          logger.info(`Seed loaded from ${seedPath}: ${result.reindexed} docs, ${result.totalChunks} chunks`);
          seedLoaded = true;
          break;
        }
      } catch {}
    }

    if (!seedLoaded) {
      // Fallback: create from embedded knowledge
      logger.info("No seed file found, creating default Goa knowledge base");
      const defaultDocs = [
        {
          title: "Baga Beach",
          content: "Baga Beach is one of the popular beaches in North Goa. It is known for water sports, beach shacks, nightlife and a lively atmosphere. Located near Calangute, it's a hub for tourists seeking entertainment and adventure activities like parasailing and jet skiing.",
          category: "beaches",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/baga-beach",
        },
        {
          title: "Anjuna Beach",
          content: "Anjuna Beach is a popular North Goa destination known for its scenic coastline, beach atmosphere and flea market. The Wednesday flea market is famous for souvenirs, clothes, and local crafts. It's also known for its trance parties and laid-back vibe.",
          category: "beaches",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/anjuna-beach",
        },
        {
          title: "Calangute Beach",
          content: "Calangute Beach is one of the largest and most popular beaches in North Goa and is known for its tourism, water activities and beach shacks. Often called the 'Queen of Beaches', it offers a vibrant atmosphere with numerous shacks serving Goan cuisine and seafood.",
          category: "beaches",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/calangute-beach",
        },
        {
          title: "Fort Aguada",
          content: "Fort Aguada is a historic Portuguese fort in Goa overlooking the Arabian Sea. Built in 1612, it is known for its architecture, lighthouse and sea views. The fort was built to guard against Dutch and Maratha invasions and houses a freshwater spring.",
          category: "history",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/fort-aguada",
        },
        {
          title: "Chapora Fort",
          content: "Chapora Fort is a historic fort in North Goa famous for panoramic views of the coastline and surrounding landscape. Built by the Portuguese in 1717, it gained fame from the Bollywood movie Dil Chahta Hai. It offers stunning sunset views over Vagator Beach.",
          category: "history",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/chapora-fort",
        },
        {
          title: "Goa",
          content: "Goa is a coastal state in western India known for beaches, Portuguese-influenced heritage, tourism, seafood, nightlife and cultural attractions. It's India's smallest state by area but has rich history from 450 years of Portuguese rule. Known for churches, temples, spice plantations, and vibrant culture.",
          category: "general",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/goa",
        },
        {
          title: "North Goa",
          content: "North Goa is known for popular beaches, nightlife, water sports, beach shacks, markets and historic attractions. It includes Baga, Calangute, Anjuna, Vagator, and is more commercialized and lively. Famous for forts like Aguada and Chapora, and bustling markets.",
          category: "general",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/north-goa",
        },
        {
          title: "South Goa",
          content: "South Goa is known for quieter beaches, scenic landscapes, resorts, churches and a more relaxed atmosphere. Beaches like Palolem, Colva, and Benaulim are less crowded. It's ideal for peace, yoga retreats, and luxury resorts. Also known for Dudhsagar Falls and heritage churches.",
          category: "general",
          source: "Goa Tourism",
          url: "https://goa-tourism.com/south-goa",
        },
      ];

      const docs = defaultDocs.map((d, idx) => ({
        id: `seed_${idx}_${d.title.toLowerCase().replace(/\s+/g, "_")}`,
        ...d,
        metadata: { seed: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      for (const doc of docs) {
        await docRepo.create(doc as any);
      }

      const result = await ingestionService.reindexAll(docs as any);
      logger.info(`Default seed loaded: ${result.reindexed} docs, ${result.totalChunks} chunks`);
    }
  } else {
    logger.info(`Vector store already contains ${existingChunks.length} chunks`);
    // Ensure doc repo has docs
    const docs = await docRepo.getAll();
    if (docs.length === 0) {
      // Load from seed to populate doc repo even if vector store has data
      const seedPath = path.join(__dirname, "../../public/data/knowledge.json");
      try {
        await docRepo.loadSeed(seedPath);
      } catch {}
    }
  }

  // Controllers
  const chatController = new ChatController(ragService, conversationRepo);
  const voiceController = new VoiceController(ragService, conversationRepo);
  const documentsController = new DocumentsController(docRepo, ingestionService, vectorStore);

  // Routes
  app.use("/api/health", createHealthRoutes(ragService, docRepo, vectorStore));
  app.use("/api/chat", createChatRoutes(chatController));
  app.use("/api/voice", createVoiceRoutes(voiceController));
  app.use("/api/documents", createDocumentRoutes(documentsController));

  app.get("/api/config", (req, res) => {
    res.json({
      rag: {
        topK: env.TOP_K,
        minScore: env.MIN_RETRIEVAL_SCORE,
        chunkSize: env.CHUNK_SIZE,
        chunkOverlap: env.CHUNK_OVERLAP,
        semanticWeight: env.SEMANTIC_WEIGHT,
        keywordWeight: env.KEYWORD_WEIGHT,
        maxContextChars: env.MAX_CONTEXT_CHARS,
      },
      models: {
        llm: env.GEMINI_MODEL,
        embedding: env.EMBEDDING_MODEL,
        llmProvider: env.LLM_PROVIDER,
      },
      features: {
        voice: true,
        documents: true,
        conversation: true,
        hybridSearch: true,
        reranking: true,
      },
      env: env.NODE_ENV,
    });
  });

  // Serve frontend static if built
  const clientDistPaths = [
    path.join(__dirname, "../../client/dist"),
    path.join(__dirname, "../client/dist"),
    path.join(process.cwd(), "client/dist"),
    path.join(__dirname, "../../public"),
  ];

  for (const clientPath of clientDistPaths) {
    try {
      const fs = await import("node:fs/promises");
      await fs.access(clientPath);
      logger.info(`Serving frontend from ${clientPath}`);
      app.use(express.static(clientPath));
      break;
    } catch {}
  }

  // Fallback to index.html for SPA
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    // Try to serve index.html from client dist or public
    const possibleIndex = [
      path.join(__dirname, "../../client/dist/index.html"),
      path.join(__dirname, "../client/dist/index.html"),
      path.join(process.cwd(), "client/dist/index.html"),
      path.join(__dirname, "../../public/index.html"),
    ];

    (async () => {
      for (const idxPath of possibleIndex) {
        try {
          const fs = await import("node:fs/promises");
          await fs.access(idxPath);
          return res.sendFile(idxPath);
        } catch {}
      }
      return next();
    })();
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, services: { vectorStore, ragService, docRepo, conversationRepo } };
}
