import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { Paper } from '../models/Paper.js';
import { generateSummary } from './summary.service.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const CHAT_MODEL = 'gemini-2.5-flash';

/** Structured comparison result */
export interface ComparisonResult {
  papers: Array<{ id: string; title: string }>;
  comparison: {
    objectives: string;
    methodology: string;
    datasets: string;
    results: string;
    limitations: string;
  };
  overallAnalysis: string;
}

/**
 * Compares 2-5 research papers by their summaries.
 * Generates summaries for any paper that doesn't already have one cached.
 *
 * @param paperIds - Array of 2-5 paper ID strings to compare
 * @returns Structured comparison across multiple dimensions
 */
export async function comparePapers(paperIds: string[]): Promise<ComparisonResult> {
  if (paperIds.length < 2 || paperIds.length > 5) {
    throw new Error('Please provide between 2 and 5 paper IDs for comparison');
  }

  // Fetch all papers
  const papers = await Paper.find({ _id: { $in: paperIds } }).lean();

  if (papers.length < 2) {
    throw new Error('Could not find at least 2 of the specified papers');
  }

  const unreadyPapers = papers.filter((p) => p.status !== 'ready');
  if (unreadyPapers.length > 0) {
    throw new Error('Some selected papers are still processing or failed to process. Please wait for them to finish or remove them from the comparison.');
  }

  // Ensure summaries exist for all papers sequentially
  const paperSummaries = [];
  for (const paper of papers) {
    let summary = paper.summary;
    if (!summary?.problemStatement) {
      summary = await generateSummary(paper._id.toString());
    }
    paperSummaries.push({ paper, summary });
  }

  // Build comparison prompt
  const papersContext = paperSummaries
    .map(({ paper, summary }, i) => {
      return `PAPER ${i + 1}: "${paper.title}"
- Problem Statement: ${summary.problemStatement}
- Methodology: ${summary.methodology}
- Results: ${summary.results}
- Limitations: ${summary.limitations}
- Future Work: ${summary.futureWork}`;
    })
    .join('\n\n');

  const prompt = `Compare the following research papers across multiple dimensions.

${papersContext}

Provide your response in EXACTLY this JSON format (no markdown, no code fences):
{
  "objectives": "Compare the research objectives of all papers (3-5 sentences)",
  "methodology": "Compare the methodologies used across papers (3-5 sentences)",
  "datasets": "Compare the datasets or data sources used (3-5 sentences)",
  "results": "Compare the key findings and results (3-5 sentences)",
  "limitations": "Compare the limitations of each paper (3-5 sentences)",
  "overallAnalysis": "Provide an overall comparative analysis highlighting key similarities, differences, and which paper(s) provide the strongest contribution (4-6 sentences)"
}`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: { temperature: 0.3 },
  });

  const responseText = response.text ?? '';
  return parseComparisonResponse(responseText, papers);
}

/**
 * Parses the Gemini response into a structured ComparisonResult.
 */
function parseComparisonResponse(
  text: string,
  papers: Array<{ _id: unknown; title: string }>
): ComparisonResult {
  const paperList = papers.map((p) => ({
    id: String(p._id),
    title: p.title,
  }));

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        papers: paperList,
        comparison: {
          objectives: text.slice(0, 500),
          methodology: '',
          datasets: '',
          results: '',
          limitations: '',
        },
        overallAnalysis: '',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      papers: paperList,
      comparison: {
        objectives: String(parsed.objectives ?? ''),
        methodology: String(parsed.methodology ?? ''),
        datasets: String(parsed.datasets ?? ''),
        results: String(parsed.results ?? ''),
        limitations: String(parsed.limitations ?? ''),
      },
      overallAnalysis: String(parsed.overallAnalysis ?? ''),
    };
  } catch {
    return {
      papers: paperList,
      comparison: {
        objectives: text.slice(0, 500),
        methodology: '',
        datasets: '',
        results: '',
        limitations: '',
      },
      overallAnalysis: '',
    };
  }
}
