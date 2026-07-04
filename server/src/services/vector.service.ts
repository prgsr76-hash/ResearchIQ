import mongoose from 'mongoose';
import { Embedding } from '../models/Embedding.js';

/** Result from a vector search query */
export interface VectorSearchResult {
  text: string;
  paperId: mongoose.Types.ObjectId;
  chunkIndex: number;
  score: number;
  metadata: {
    pageNumber: number;
    section: string;
  };
}

/**
 * Performs a MongoDB Atlas Vector Search against the Embedding collection.
 *
 * If the Atlas Vector Search index ("vector_index") is not configured,
 * falls back to in-memory cosine similarity search.
 *
 * @param queryEmbedding - The 768-dim query vector
 * @param userId         - Filter results to this user's papers only
 * @param limit          - Maximum number of results to return (default 5)
 * @returns Ranked array of matching chunks with scores
 */
export async function searchVectors(
  queryEmbedding: number[],
  userId: string,
  limit: number = 5
): Promise<VectorSearchResult[]> {
  try {
    return await atlasVectorSearch(queryEmbedding, userId, limit);
  } catch (error: any) {
    // If Atlas Vector Search index is not set up, fall back to in-memory search
    const errMsg = String(error?.message || error || '');
    if (
      errMsg.includes('vector_index') ||
      errMsg.includes('PlanExecutor') ||
      errMsg.includes('$vectorSearch') ||
      errMsg.includes('not found') ||
      errMsg.includes('index') ||
      error?.codeName === 'InvalidPipelineOperator'
    ) {
      console.warn('[Vector] Atlas Vector Search unavailable, using in-memory fallback.');
      return await inMemorySearch(queryEmbedding, userId, limit);
    }
    throw error;
  }
}

/**
 * Atlas Vector Search via $vectorSearch aggregation.
 */
async function atlasVectorSearch(
  queryEmbedding: number[],
  userId: string,
  limit: number
): Promise<VectorSearchResult[]> {
  const pipeline = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit,
        filter: { userId: new mongoose.Types.ObjectId(userId) },
      },
    },
    {
      $project: {
        text: 1,
        paperId: 1,
        chunkIndex: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const results = await Embedding.aggregate(pipeline);

  return results.map((doc) => ({
    text: doc.text as string,
    paperId: doc.paperId as mongoose.Types.ObjectId,
    chunkIndex: doc.chunkIndex as number,
    score: doc.score as number,
    metadata: {
      pageNumber: doc.metadata?.pageNumber ?? 0,
      section: doc.metadata?.section ?? '',
    },
  }));
}

/**
 * In-memory cosine similarity fallback when Atlas Vector Search is unavailable.
 * Fetches all embeddings for the user and ranks them locally.
 */
async function inMemorySearch(
  queryEmbedding: number[],
  userId: string,
  limit: number
): Promise<VectorSearchResult[]> {
  // Fetch all embeddings for the user (capped at 500 to avoid memory issues)
  const allEmbeddings = await Embedding.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select('text paperId chunkIndex metadata embedding')
    .limit(500)
    .lean();

  if (allEmbeddings.length === 0) {
    return [];
  }

  // Compute cosine similarity for each embedding
  const scored = allEmbeddings
    .map((doc) => {
      const embedding = doc.embedding as number[];
      if (!embedding || embedding.length === 0) return null;
      const score = cosineSimilarity(queryEmbedding, embedding);
      return {
        text: doc.text as string,
        paperId: doc.paperId as mongoose.Types.ObjectId,
        chunkIndex: doc.chunkIndex as number,
        score,
        metadata: {
          pageNumber: (doc.metadata as any)?.pageNumber ?? 0,
          section: (doc.metadata as any)?.section ?? '',
        },
      };
    })
    .filter((r): r is VectorSearchResult => r !== null);

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}
