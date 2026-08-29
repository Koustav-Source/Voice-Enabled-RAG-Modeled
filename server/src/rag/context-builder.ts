import { RetrievedChunk } from "../types/rag.js";
import { env } from "../config/env.js";

export interface ContextBuilderOptions {
  maxChars: number;
  includeMetadata: boolean;
}

export class ContextBuilder {
  private options: ContextBuilderOptions;

  constructor(options: Partial<ContextBuilderOptions> = {}) {
    this.options = {
      maxChars: options.maxChars ?? env.MAX_CONTEXT_CHARS,
      includeMetadata: options.includeMetadata ?? true,
    };
  }

  build(chunks: RetrievedChunk[]): { context: string; usedChunks: RetrievedChunk[]; totalChars: number } {
    let usedChars = 0;
    const parts: string[] = [];
    const usedChunks: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const meta = this.options.includeMetadata
        ? `[SOURCE ${usedChunks.length + 1}: ${chunk.title} | ${chunk.source} | ${chunk.category} | ID: ${chunk.chunkId}]`
        : "";

      const part = `${meta}\n${chunk.content}\n`;

      if (usedChars + part.length > this.options.maxChars) {
        // Try to include truncated version if we have space for at least 100 chars
        const remaining = this.options.maxChars - usedChars;
        if (remaining > 100) {
          const truncated = chunk.content.slice(0, remaining - meta.length - 10) + "...";
          parts.push(`${meta}\n${truncated}\n`);
          usedChunks.push(chunk);
          usedChars += remaining;
        }
        break;
      }

      parts.push(part);
      usedChunks.push(chunk);
      usedChars += part.length;
    }

    return {
      context: parts.join("\n---\n\n"),
      usedChunks,
      totalChars: usedChars,
    };
  }

  buildWithStats(chunks: RetrievedChunk[]) {
    const result = this.build(chunks);
    return {
      ...result,
      stats: {
        requested: chunks.length,
        used: result.usedChunks.length,
        totalChars: result.totalChars,
        maxChars: this.options.maxChars,
      },
    };
  }
}
