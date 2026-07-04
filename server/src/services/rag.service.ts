import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { generateEmbedding } from './embedding.service.js';
import { searchVectors, type VectorSearchResult } from './vector.service.js';
import { Paper } from '../models/Paper.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const CHAT_MODEL = 'gemini-2.5-flash';

/** Source citation attached to a RAG answer */
export interface RAGSource {
  paperId: string;
  paperTitle: string;
  chunkText: string;
  score: number;
}

/** Full RAG response */
export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
}

const SYSTEM_PROMPT = `You are ResearchIQ, an AI research assistant. Your role is to help researchers understand and analyze their academic papers.

INSTRUCTIONS:
- Answer ONLY based on the provided context from the user's research papers.
- Cite sources by referencing paper titles in your answer (e.g., "According to [Paper Title]...").
- If the context does not contain enough information to answer the question, say "I don't have enough information in your uploaded papers to answer this question."
- Be precise, academic, and helpful.
- When comparing information across papers, clearly attribute findings to their respective sources.
- Use structured formatting (bullet points, numbered lists) when presenting multiple findings.`;

/**
 * Runs the full RAG pipeline:
 * 1. Embeds the user's query
 * 2. Retrieves relevant chunks via vector search
 * 3. Builds context and prompts Gemini
 * 4. Returns the answer with source citations
 *
 * @param query  - The user's natural-language question
 * @param userId - The authenticated user's ID (for scoped search)
 * @param limit  - Max number of chunks to retrieve (default 5)
 * @returns Answer text and source citations
 */
export async function runRAGPipeline(
  query: string,
  userId: string,
  limit: number = 5
): Promise<RAGResponse> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Search for relevant chunks
  const searchResults = await searchVectors(queryEmbedding, userId, limit);

  if (searchResults.length === 0) {
    return {
      answer:
        "I don't have enough information in your uploaded papers to answer this question. Please upload relevant papers first.",
      sources: [],
    };
  }

  // 3. Enrich results with paper titles
  const paperIds = [...new Set(searchResults.map((r) => r.paperId.toString()))];
  const papers = await Paper.find({ _id: { $in: paperIds } }).select('title').lean();
  const paperTitleMap = new Map(papers.map((p) => [p._id.toString(), p.title]));

  // 4. Build context string
  const context = buildContext(searchResults, paperTitleMap);

  // 5. Construct prompt
  const userPrompt = `CONTEXT FROM RESEARCH PAPERS:
${context}

USER QUESTION:
${query}

Please provide a comprehensive answer based on the context above.`;

  // 6. Call Gemini with retry
  const response = await generateContentWithRetry({
    model: CHAT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
    },
  });

  const answer = response.text ?? 'Unable to generate a response.';

  // 7. Build sources list
  const sources: RAGSource[] = searchResults.map((result) => ({
    paperId: result.paperId.toString(),
    paperTitle: paperTitleMap.get(result.paperId.toString()) ?? 'Unknown Paper',
    chunkText: result.text.slice(0, 200),
    score: result.score,
  }));

  return { answer, sources };
}

/**
 * Calls generateContent with retry on rate limit (429) or transient (503) errors.
 */
async function generateContentWithRetry(params: any, retries = 4, delayMs = 15000): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorString = JSON.stringify(error) + (error.message || '');
    const isDailyQuota = errorString.includes('PerDay');
    
    if (isDailyQuota) {
      console.warn(`[RAG] Daily quota exceeded. Failing fast without retries.`);
      throw error;
    }

    const isRateLimit =
      error.status === 429 ||
      error.status === 503 ||
      errorString.includes('quota') ||
      errorString.includes('limit');

    if (retries > 0 && isRateLimit) {
      console.warn(`[RAG] generateContent error (Status: ${error.status || 'unknown'}). Retrying in ${delayMs}ms... (Retries left: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return generateContentWithRetry(params, retries - 1, delayMs * 2);
    }
    throw error;
  }
}


/**
 * Constructs a formatted context string from retrieved chunks.
 */
function buildContext(
  results: VectorSearchResult[],
  titleMap: Map<string, string>
): string {
  return results
    .map((r, i) => {
      const title = titleMap.get(r.paperId.toString()) ?? 'Unknown Paper';
      return `[Source ${i + 1}] Paper: "${title}" (relevance: ${r.score.toFixed(3)})
${r.text}`;
    })
    .join('\n\n---\n\n');
}
