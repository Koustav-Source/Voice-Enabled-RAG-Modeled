import { v4 as uuidv4 } from "uuid";
import { Document, Chunk } from "../types/rag.js";
import { cleanText, countTokensApprox } from "../utils/text.js";
import { env } from "../config/env.js";

export interface ChunkerOptions {
  chunkSize: number;
  overlap: number;
  minChunkSize: number;
}

const DEFAULT_OPTIONS: ChunkerOptions = {
  chunkSize: env.CHUNK_SIZE,
  overlap: env.CHUNK_OVERLAP,
  minChunkSize: 100,
};

export class Chunker {
  private options: ChunkerOptions;

  constructor(options: Partial<ChunkerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  chunkDocument(doc: Document): Chunk[] {
    const cleaned = cleanText(doc.content);
    if (!cleaned) return [];

    // If document is small, return single chunk
    if (cleaned.length <= this.options.chunkSize) {
      return [
        {
          chunkId: `${doc.id}_0`,
          documentId: doc.id,
          title: doc.title,
          content: cleaned,
          source: doc.source,
          url: doc.url,
          category: doc.category,
          position: 0,
          metadata: doc.metadata,
          tokenCount: countTokensApprox(cleaned),
        },
      ];
    }

    const chunks: Chunk[] = [];
    let start = 0;
    let position = 0;

    while (start < cleaned.length) {
      let end = start + this.options.chunkSize;

      if (end < cleaned.length) {
        // Try to break at sentence boundary
        const slice = cleaned.slice(start, end);
        const lastPeriod = Math.max(
          slice.lastIndexOf(". "),
          slice.lastIndexOf("! "),
          slice.lastIndexOf("? "),
          slice.lastIndexOf("\n")
        );
        if (lastPeriod > this.options.chunkSize * 0.5) {
          end = start + lastPeriod + 1;
        }
      } else {
        end = cleaned.length;
      }

      const content = cleaned.slice(start, end).trim();

      if (content.length >= this.options.minChunkSize) {
        chunks.push({
          chunkId: `${doc.id}_${position}`,
          documentId: doc.id,
          title: doc.title,
          content,
          source: doc.source,
          url: doc.url,
          category: doc.category,
          position,
          metadata: {
            ...doc.metadata,
            startChar: start,
            endChar: end,
          },
          tokenCount: countTokensApprox(content),
        });
        position++;
      }

      if (end >= cleaned.length) break;

      start = end - this.options.overlap;
      if (start < 0) start = 0;
    }

    return chunks;
  }

  chunkDocuments(docs: Document[]): Chunk[] {
    const all: Chunk[] = [];
    for (const doc of docs) {
      all.push(...this.chunkDocument(doc));
    }
    return all;
  }
}

// Utility function for simple use
export function chunkText(
  text: string,
  docMeta: Omit<Document, "content">,
  options?: Partial<ChunkerOptions>
): Chunk[] {
  const chunker = new Chunker(options);
  const doc: Document = {
    ...docMeta,
    content: text,
    id: docMeta.id || uuidv4(),
  };
  return chunker.chunkDocument(doc);
}
