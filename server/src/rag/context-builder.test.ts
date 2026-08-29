import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './context-builder.js';
import { RetrievedChunk } from '../types/rag.js';

describe('ContextBuilder', () => {
  it('should build context within char limit', () => {
    const builder = new ContextBuilder({ maxChars: 200 });
    const chunks: RetrievedChunk[] = [
      {
        chunkId: '1',
        documentId: 'doc1',
        title: 'Test',
        content: 'A'.repeat(100),
        source: 'Test',
        category: 'general',
        position: 0,
        retrievalScore: 0.9,
        semanticScore: 0.9,
        keywordScore: 0.8,
        combinedScore: 0.9,
      },
      {
        chunkId: '2',
        documentId: 'doc2',
        title: 'Test2',
        content: 'B'.repeat(100),
        source: 'Test',
        category: 'general',
        position: 0,
        retrievalScore: 0.8,
        semanticScore: 0.8,
        keywordScore: 0.7,
        combinedScore: 0.8,
      },
    ];

    const result = builder.build(chunks);
    expect(result.totalChars).toBeLessThanOrEqual(200);
    expect(result.usedChunks.length).toBeLessThanOrEqual(2);
  });

  it('should preserve metadata', () => {
    const builder = new ContextBuilder({ maxChars: 1000 });
    const chunks: RetrievedChunk[] = [
      {
        chunkId: 'chunk_1',
        documentId: 'doc_1',
        title: 'Baga Beach',
        content: 'Beach content',
        source: 'Goa Tourism',
        url: 'https://example.com',
        category: 'beaches',
        position: 0,
        retrievalScore: 0.9,
        semanticScore: 0.9,
        keywordScore: 0.8,
        combinedScore: 0.9,
      },
    ];

    const result = builder.build(chunks);
    expect(result.context).toContain('Baga Beach');
    expect(result.context).toContain('Goa Tourism');
    expect(result.context).toContain('chunk_1');
  });
});
