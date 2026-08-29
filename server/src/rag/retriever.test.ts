import { describe, it, expect, beforeEach } from 'vitest';
import { Retriever } from './retriever.js';
import { InMemoryVectorStore } from '../services/vector-store.js';
import { LocalEmbeddingProvider } from './embeddings.js';
import { Chunk } from '../types/rag.js';

describe('Retriever', () => {
  let vectorStore: InMemoryVectorStore;
  let embeddingProvider: LocalEmbeddingProvider;
  let retriever: Retriever;

  beforeEach(async () => {
    vectorStore = new InMemoryVectorStore();
    embeddingProvider = new LocalEmbeddingProvider(64); // small for speed
    retriever = new Retriever(vectorStore, embeddingProvider);

    // Seed with test data
    const chunks: Chunk[] = [
      {
        chunkId: '1',
        documentId: 'doc1',
        title: 'Baga Beach',
        content: 'Baga Beach is popular for water sports and nightlife in North Goa',
        source: 'Goa Tourism',
        category: 'beaches',
        position: 0,
        embedding: await embeddingProvider.embed('Baga Beach is popular for water sports and nightlife in North Goa'),
        retrievalScore: 0,
        semanticScore: 0,
        keywordScore: 0,
        combinedScore: 0,
      } as any,
      {
        chunkId: '2',
        documentId: 'doc2',
        title: 'South Goa',
        content: 'South Goa is known for quieter beaches and relaxed atmosphere',
        source: 'Goa Tourism',
        category: 'general',
        position: 0,
        embedding: await embeddingProvider.embed('South Goa is known for quieter beaches and relaxed atmosphere'),
        retrievalScore: 0,
        semanticScore: 0,
        keywordScore: 0,
        combinedScore: 0,
      } as any,
      {
        chunkId: '3',
        documentId: 'doc3',
        title: 'Fort Aguada',
        content: 'Fort Aguada is historic Portuguese fort overlooking Arabian Sea',
        source: 'Goa Tourism',
        category: 'history',
        position: 0,
        embedding: await embeddingProvider.embed('Fort Aguada is historic Portuguese fort overlooking Arabian Sea'),
        retrievalScore: 0,
        semanticScore: 0,
        keywordScore: 0,
        combinedScore: 0,
      } as any,
    ];

    await vectorStore.addDocuments(chunks);
  });

  it('should retrieve exact keyword match', async () => {
    const result = await retriever.retrieve('Baga Beach water sports', { topK: 2 });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('Baga Beach');
  });

  it('should retrieve semantic-like query', async () => {
    const result = await retriever.retrieve('quiet peaceful beaches', { topK: 2 });
    expect(result.results.length).toBeGreaterThan(0);
    // South Goa should be top for quiet beaches
    const titles = result.results.map(r => r.title);
    expect(titles).toContain('South Goa');
  });

  it('should handle irrelevant query with low scores', async () => {
    const result = await retriever.retrieve('quantum physics black holes', { topK: 2, minScore: 0.5 });
    // Should return 0 or low relevance
    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  it('should respect topK', async () => {
    const result = await retriever.retrieve('Goa beach', { topK: 1 });
    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  it('should rewrite follow-up queries', () => {
    const history = [
      { role: 'user', content: 'Tell me about beaches in Goa' },
      { role: 'assistant', content: 'Goa has many beaches including Baga, Anjuna...' },
    ];
    const rewritten = retriever.rewriteQuery('Which ones are quieter?', history as any);
    expect(rewritten).toContain('beaches');
    expect(rewritten.length).toBeGreaterThan('Which ones are quieter?'.length);
  });
});
