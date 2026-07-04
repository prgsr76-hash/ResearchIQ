import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { Paper, type IPaperSummary } from '../models/Paper.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const CHAT_MODEL = 'gemini-2.5-flash';

/** Maximum characters of paper text sent for summarization */
const MAX_TEXT_LENGTH = 8000;

/**
 * Generates a structured summary for a paper using Gemini.
 * If the paper already has a cached summary, returns it immediately.
 *
 * @param paperId - The paper's MongoDB ObjectId string
 * @returns Structured summary with problem, methodology, results, limitations, and future work
 */
export async function generateSummary(paperId: string): Promise<IPaperSummary> {
  const paper = await Paper.findById(paperId);
  if (!paper) throw new Error('Paper not found');

  // Return cached summary if available
  if (paper.summary && paper.summary.problemStatement) {
    return paper.summary;
  }

  const textToSummarize = paper.fullText.slice(0, MAX_TEXT_LENGTH);

  if (!textToSummarize || textToSummarize.trim().length === 0) {
    throw new Error('Paper has no extracted text to summarize');
  }

  const prompt = `Analyze the following academic paper text and provide a structured summary.

PAPER TEXT:
${textToSummarize}

Provide your response in EXACTLY this JSON format (no markdown, no code fences):
{
  "problemStatement": "A clear description of the research problem being addressed (2-3 sentences)",
  "methodology": "The methods and approaches used in the research (2-3 sentences)",
  "results": "The key findings and results (2-3 sentences)",
  "limitations": "The acknowledged or apparent limitations of the research (2-3 sentences)",
  "futureWork": "Suggested or mentioned directions for future research (2-3 sentences)"
}`;

  const response = await generateContentWithRetry({
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  });

  const responseText = response.text ?? '';
  const summary = parseSummaryResponse(responseText);

  // Cache in the database
  paper.summary = summary;
  await paper.save();

  return summary;
}

/**
 * Parses the Gemini response text into a structured summary object.
 * Handles JSON extraction from potentially noisy LLM output.
 */
function parseSummaryResponse(text: string): IPaperSummary {
  const defaultSummary: IPaperSummary = {
    problemStatement: '',
    methodology: '',
    results: '',
    limitations: '',
    futureWork: '',
  };

  try {
    // Try to extract JSON from the response (handles stray markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Summary] No JSON found in Gemini response');
      return { ...defaultSummary, problemStatement: text.slice(0, 500) };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      problemStatement: String(parsed.problemStatement ?? ''),
      methodology: String(parsed.methodology ?? ''),
      results: String(parsed.results ?? ''),
      limitations: String(parsed.limitations ?? ''),
      futureWork: String(parsed.futureWork ?? ''),
    };
  } catch (error) {
    console.warn('[Summary] Failed to parse Gemini response:', error);
    return { ...defaultSummary, problemStatement: text.slice(0, 500) };
  }
}

async function generateContentWithRetry(params: any, retries = 3, delayMs = 15000): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorString = JSON.stringify(error) + (error.message || '');
    const isDailyQuota = errorString.includes('PerDay');
    
    if (isDailyQuota) {
      console.warn(`[Summary] Daily quota exceeded. Failing fast without retries.`);
      throw error;
    }

    const isRateLimit =
      error.status === 429 ||
      error.status === 503 ||
      errorString.includes('quota') ||
      errorString.includes('limit');

    if (retries > 0 && isRateLimit) {
      console.warn(
        `[Summary] generateContent error (Status: ${error.status || 'unknown'}). Retrying in ${delayMs}ms... (Retries left: ${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return generateContentWithRetry(params, retries - 1, delayMs * 2);
    }
    throw error;
  }
}
