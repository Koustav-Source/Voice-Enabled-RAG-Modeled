import { Router } from "express";
import { RAGService } from "../services/rag.service.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { InMemoryVectorStore } from "../services/vector-store.js";

export function createHealthRoutes(
  ragService: RAGService,
  docRepo: DocumentRepository,
  vectorStore: InMemoryVectorStore
): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const ragHealth = await ragService.healthCheck();
      const docStats = await docRepo.getStats();
      const vectorHealth = await vectorStore.healthCheck();

      res.json({
        status: "healthy",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        llm: ragHealth.llm,
        embedding: ragHealth.embedding,
        vectorStore: vectorHealth,
        documents: docStats.totalDocuments,
        categories: docStats.categories,
        uptime: process.uptime(),
      });
    } catch (err: any) {
      res.status(500).json({
        status: "unhealthy",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get("/config", async (req, res) => {
    // Safe config (no secrets)
    res.json({
      rag: {
        topK: process.env.TOP_K || 5,
        minScore: process.env.MIN_RETRIEVAL_SCORE || 0.08,
        chunkSize: process.env.CHUNK_SIZE || 800,
        chunkOverlap: process.env.CHUNK_OVERLAP || 150,
      },
      models: {
        llm: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        embedding: process.env.EMBEDDING_MODEL || "local-hashed-tfidf-384",
      },
      features: {
        voice: true,
        documents: true,
        conversation: true,
        hybridSearch: true,
        reranking: true,
      },
    });
  });

  return router;
}
