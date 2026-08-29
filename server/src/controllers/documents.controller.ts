import { Request, Response, NextFunction } from "express";
import { DocumentRepository } from "../repositories/document.repository.js";
import { IngestionService } from "../services/ingestion.service.js";
import { InMemoryVectorStore } from "../services/vector-store.js";
import { logger } from "../utils/logger.js";
import fs from "node:fs/promises";
import path from "node:path";

export class DocumentsController {
  constructor(
    private docRepo: DocumentRepository,
    private ingestionService: IngestionService,
    private vectorStore: InMemoryVectorStore
  ) {}

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const docs = await this.docRepo.getAll();
      const chunks = await this.vectorStore.getAllChunks();

      const chunkCountByDoc = new Map<string, number>();
      for (const chunk of chunks) {
        chunkCountByDoc.set(chunk.documentId, (chunkCountByDoc.get(chunk.documentId) || 0) + 1);
      }

      const enriched = docs.map((doc) => ({
        ...doc,
        chunkCount: chunkCountByDoc.get(doc.id) || 0,
      }));

      res.json({
        documents: enriched,
        total: enriched.length,
        totalChunks: chunks.length,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const doc = await this.docRepo.getById(id);
      if (!doc) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Document not found" });
      }
      const chunks = (await this.vectorStore.getAllChunks()).filter((c) => c.documentId === id);
      res.json({ document: doc, chunks });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content, source, url, category, metadata } = req.body;

      const { document, chunks } = await this.ingestionService.ingestDocument({
        title,
        content,
        source,
        url,
        category,
        metadata,
      });

      await this.docRepo.create(document);

      res.status(201).json({
        document,
        chunks: chunks.length,
        chunkIds: chunks.map((c) => c.chunkId),
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const doc = await this.docRepo.getById(id);
      if (!doc) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Document not found" });
      }

      await this.vectorStore.delete(id);
      await this.docRepo.delete(id);

      res.json({ deleted: true, id });
    } catch (err) {
      next(err);
    }
  }

  async reindex(req: Request, res: Response, next: NextFunction) {
    try {
      const start = Date.now();
      const docs = await this.docRepo.getAll();

      // Clear vector store and re-ingest
      (this.vectorStore as any).clear();

      const result = await this.ingestionService.reindexAll(docs);

      res.json({
        reindexed: result.reindexed,
        totalChunks: result.totalChunks,
        timingMs: Date.now() - start,
      });
    } catch (err) {
      next(err);
    }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const docStats = await this.docRepo.getStats();
      const vectorHealth = await this.vectorStore.healthCheck();
      const chunks = await this.vectorStore.getAllChunks();

      const categories: Record<string, number> = {};
      const sources: Record<string, number> = {};

      for (const chunk of chunks) {
        categories[chunk.category] = (categories[chunk.category] || 0) + 1;
        sources[chunk.source] = (sources[chunk.source] || 0) + 1;
      }

      res.json({
        documents: docStats.totalDocuments,
        chunks: vectorHealth.count,
        categories,
        sources,
        vectorStore: vectorHealth,
      });
    } catch (err) {
      next(err);
    }
  }
}
