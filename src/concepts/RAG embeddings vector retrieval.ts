// RAG — embeddings & vector retrieval
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Generate embeddings for text chunks
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  return result.embeddings[0].values;
}

// Cosine similarity for vector retrieval
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// RAG pipeline: retrieve relevant docs then generate answer
export async function ragQuery(query: string, documents: { text: string; embedding: number[] }[]) {
  const queryEmbedding = await generateEmbedding(query);

  // Retrieve top-k most relevant documents
  const ranked = documents
    .map(doc => ({ ...doc, score: cosineSimilarity(queryEmbedding, doc.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const context = ranked.map(d => d.text).join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Context:\n${context}\n\nQuestion: ${query}\nAnswer based on the context above.`,
  });

  return { answer: response.text(), sources: ranked };
}
