import { describe, it, expect } from 'vitest';
import { Chunker } from './chunker.js';
import { Document } from '../types/rag.js';

describe('Chunker', () => {
  const chunker = new Chunker({ chunkSize: 200, overlap: 50, minChunkSize: 50 });

  it('should chunk small document as single chunk', () => {
    const doc: Document = {
      id: 'test1',
      title: 'Test Doc',
      content: 'This is a short document.',
      source: 'Test',
      category: 'general',
    };

    const chunks = chunker.chunkDocument(doc);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('short document');
    expect(chunks[0].documentId).toBe('test1');
  });

  it('should chunk large document into multiple chunks with overlap', () => {
    const longContent = 'This is sentence one. '.repeat(50) + 'This is sentence two. '.repeat(50);
    const doc: Document = {
      id: 'test2',
      title: 'Long Doc',
      content: longContent,
      source: 'Test',
      category: 'general',
    };

    const chunks = chunker.chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    // Check overlap exists
    expect(chunks[0].content.length).toBeGreaterThan(50);
    expect(chunks[1].position).toBe(1);
  });

  it('should preserve metadata', () => {
    const doc: Document = {
      id: 'test3',
      title: 'Meta Doc',
      content: 'Content here',
      source: 'Goa Tourism',
      url: 'https://example.com',
      category: 'beaches',
      metadata: { author: 'test' },
    };

    const chunks = chunker.chunkDocument(doc);
    expect(chunks[0].source).toBe('Goa Tourism');
    expect(chunks[0].url).toBe('https://example.com');
    expect(chunks[0].category).toBe('beaches');
    expect(chunks[0].metadata).toHaveProperty('author', 'test');
  });

  it('should handle empty content', () => {
    const doc: Document = {
      id: 'test4',
      title: 'Empty',
      content: '',
      source: 'Test',
      category: 'general',
    };

    const chunks = chunker.chunkDocument(doc);
    expect(chunks).toHaveLength(0);
  });
});
