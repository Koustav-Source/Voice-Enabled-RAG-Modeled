import { Document } from "../types/rag.js";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";

export class DocumentRepository {
  private documents: Map<string, Document> = new Map();
  private persistPath?: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath;
  }

  async loadSeed(seedPath: string): Promise<Document[]> {
    try {
      const data = await fs.readFile(seedPath, "utf-8");
      const raw = JSON.parse(data);
      // Normalize legacy format: content vs text bug fix
      const docs: Document[] = raw.map((item: any, idx: number) => ({
        id: item.id || `seed_${idx}_${(item.title || "doc").toLowerCase().replace(/\s+/g, "_")}`,
        title: item.title,
        content: item.content || item.text || "", // BUG FIX: was using chunk.text but data has content
        source: item.source || "Goa Tourism",
        url: item.url || undefined,
        category: item.category || "general",
        metadata: { seed: true, ...item.metadata },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      for (const doc of docs) {
        this.documents.set(doc.id, doc);
      }

      logger.info(`Loaded ${docs.length} seed documents from ${seedPath}`);
      return docs;
    } catch (err) {
      logger.error(`Failed to load seed from ${seedPath}`, { error: String(err) });
      return [];
    }
  }

  async getAll(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getById(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async create(doc: Document): Promise<Document> {
    this.documents.set(doc.id, doc);
    await this.persist();
    return doc;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.documents.delete(id);
    if (existed) await this.persist();
    return existed;
  }

  async update(id: string, updates: Partial<Document>): Promise<Document | null> {
    const existing = this.documents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.documents.set(id, updated);
    await this.persist();
    return updated;
  }

  async getStats() {
    const docs = Array.from(this.documents.values());
    const categories: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const doc of docs) {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
      sources[doc.source] = (sources[doc.source] || 0) + 1;
    }

    return {
      totalDocuments: docs.length,
      categories,
      sources,
    };
  }

  private async persist(): Promise<void> {
    if (!this.persistPath) return;
    try {
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });
      const data = {
        documents: Array.from(this.documents.values()),
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      logger.error("Failed to persist documents", { error: String(err) });
    }
  }
}
