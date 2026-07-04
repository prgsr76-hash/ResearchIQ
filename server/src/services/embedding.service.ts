import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONALITY = 768;


export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await callEmbedWithRetry([text]);
  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error('No embedding values returned from Gemini');
  }

  return values;
}


/**
 * Generate embeddings for multiple texts in batches.
 * Processes up to BATCH_SIZE texts concurrently and pauses between
 * batches to stay within API rate limits.
 *
 * @param texts - Array of text strings to embed
 * @returns Array of 768-dimensional number arrays, matching input order
 */
async function callEmbedWithRetry(batch: string[], retries = 3, delayMs = 3000): Promise<any> {
  try {
    return await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { outputDimensionality: OUTPUT_DIMENSIONALITY },
    });
  } catch (error: any) {
    const errorString = JSON.stringify(error) + (error.message || '');
    const isDailyQuota = errorString.includes('PerDay');
    
    if (isDailyQuota) {
      console.warn(`[Embedding] Daily quota exceeded. Failing fast without retries.`);
      throw error;
    }

    const isRateLimit =
      error.status === 429 ||
      error.status === 503 ||
      errorString.includes('quota') ||
      errorString.includes('limit');

    if (retries > 0 && isRateLimit) {
      console.warn(
        `[Embedding] Rate limit or temp error hit (Status: ${error.status || 'unknown'}). Retrying in ${delayMs}ms... (Retries left: ${retries})`
      );
      await delay(delayMs);
      return callEmbedWithRetry(batch, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const LOCAL_BATCH_SIZE = 10; // 10 texts per API call
  const LOCAL_DELAY_MS = 6000;  // 6.0 seconds delay between API calls

  for (let i = 0; i < texts.length; i += LOCAL_BATCH_SIZE) {
    const batch = texts.slice(i, i + LOCAL_BATCH_SIZE);

    // Call embedContent with retry
    const response = await callEmbedWithRetry(batch);

    const embeddings = response.embeddings;
    if (!embeddings || embeddings.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${embeddings?.length || 0}`);
    }

    const batchVectors = embeddings.map((emb: any) => {
      if (!emb.values) throw new Error('Empty embedding values in batch response');
      return emb.values;
    });

    results.push(...batchVectors);

    // Delay between batches to stay safe under free-tier 100 RPM limit
    if (i + LOCAL_BATCH_SIZE < texts.length) {
      await delay(LOCAL_DELAY_MS);
    }
  }

  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
