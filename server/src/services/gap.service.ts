import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { Paper } from '../models/Paper.js';
import { generateSummary } from './summary.service.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const CHAT_MODEL = 'gemini-2.5-flash';

/** Structured gap analysis result */
export interface GapAnalysis {
  papersAnalyzed: Array<{ id: string; title: string }>;
  analysis: {
    coveredTopics: Array<{ topic: string; paperCount: number; papers: string[] }>;
    methodologiesUsed: Array<{ methodology: string; papers: string[] }>;
    missingAreas: string[];
    suggestedDirections: Array<{ direction: string; rationale: string }>;
  };
  overallSummary: string;
}

/**
 * Detects research gaps across a user's paper collection.
 *
 * Analyzes summaries/abstracts of all (or selected) papers to identify
 * covered topics, methodologies, underexplored areas, and suggested future directions.
 *
 * @param userId   - The authenticated user's ID
 * @param paperIds - Optional subset of paper IDs to analyze (defaults to all user papers)
 * @returns Structured gap analysis
 */
export async function analyzeGaps(
  userId: string,
  paperIds?: string[]
): Promise<GapAnalysis> {
  // Fetch papers
  const query = paperIds && paperIds.length > 0
    ? { _id: { $in: paperIds }, userId }
    : { userId };

  const papers = await Paper.find(query).lean();

  if (!papers || papers.length === 0) {
    throw new Error('No papers found. Please upload papers first.');
  }

  const unreadyPapers = papers.filter((p) => p.status !== 'ready');
  if (unreadyPapers.length > 0) {
    throw new Error('Some papers are still processing or failed to process. Gap analysis requires fully processed papers.');
  }

  // Ensure all papers have summaries sequentially
  const paperSummaries = [];
  for (const paper of papers) {
    let summary = paper.summary;
    if (!summary?.problemStatement) {
      summary = await generateSummary(paper._id.toString());
    }
    paperSummaries.push({ paper, summary });
  }

  // Build context
  const papersContext = paperSummaries
    .map(({ paper, summary }, i) => {
      return `PAPER ${i + 1}: "${paper.title}"
Keywords: ${paper.keywords?.join(', ') || 'N/A'}
Abstract: ${paper.abstract || 'N/A'}
- Problem: ${summary.problemStatement}
- Methodology: ${summary.methodology}
- Results: ${summary.results}
- Limitations: ${summary.limitations}
- Future Work: ${summary.futureWork}`;
    })
    .join('\n\n');

  const prompt = `Analyze the following collection of research papers and identify research gaps.

${papersContext}

Provide your response in EXACTLY this JSON format (no markdown, no code fences):
{
  "coveredTopics": [
    { "topic": "topic name", "paperCount": 2, "papers": ["Paper Title 1", "Paper Title 2"] }
  ],
  "methodologiesUsed": [
    { "methodology": "methodology name", "papers": ["Paper Title 1"] }
  ],
  "missingAreas": [
    "Description of underexplored area 1",
    "Description of underexplored area 2"
  ],
  "suggestedDirections": [
    { "direction": "Suggested research direction", "rationale": "Why this is worth exploring" }
  ],
  "overallSummary": "A paragraph summarizing the current state of the research collection and the most critical gaps identified (4-6 sentences)"
}`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: { temperature: 0.3 },
  });

  const responseText = response.text ?? '';
  return parseGapResponse(responseText, papers);
}

/**
 * Parses the Gemini response into a structured GapAnalysis.
 */
function parseGapResponse(
  text: string,
  papers: Array<{ _id: unknown; title: string }>
): GapAnalysis {
  const papersAnalyzed = papers.map((p) => ({
    id: String(p._id),
    title: p.title,
  }));

  const defaultAnalysis: GapAnalysis = {
    papersAnalyzed,
    analysis: {
      coveredTopics: [],
      methodologiesUsed: [],
      missingAreas: [],
      suggestedDirections: [],
    },
    overallSummary: '',
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ...defaultAnalysis, overallSummary: text.slice(0, 500) };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      papersAnalyzed,
      analysis: {
        coveredTopics: Array.isArray(parsed.coveredTopics)
          ? (parsed.coveredTopics as Array<{ topic: string; paperCount: number; papers: string[] }>)
          : [],
        methodologiesUsed: Array.isArray(parsed.methodologiesUsed)
          ? (parsed.methodologiesUsed as Array<{ methodology: string; papers: string[] }>)
          : [],
        missingAreas: Array.isArray(parsed.missingAreas)
          ? (parsed.missingAreas as string[])
          : [],
        suggestedDirections: Array.isArray(parsed.suggestedDirections)
          ? (parsed.suggestedDirections as Array<{ direction: string; rationale: string }>)
          : [],
      },
      overallSummary: String(parsed.overallSummary ?? ''),
    };
  } catch {
    return { ...defaultAnalysis, overallSummary: text.slice(0, 500) };
  }
}
