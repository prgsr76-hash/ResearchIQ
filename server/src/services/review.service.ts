import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { Paper } from '../models/Paper.js';
import { generateSummary } from './summary.service.js';
import { generateEmbedding } from './embedding.service.js';
import { searchVectors } from './vector.service.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const CHAT_MODEL = 'gemini-2.5-flash';

/** Structured literature review result */
export interface LiteratureReview {
  topic: string;
  papersUsed: Array<{ id: string; title: string }>;
  review: {
    introduction: string;
    existingResearch: string;
    comparativeAnalysis: string;
    researchGaps: string;
    conclusion: string;
  };
}

/**
 * Generates a literature review on a given topic.
 *
 * If specific paper IDs are provided, uses those papers.
 * Otherwise, uses vector search to find the most relevant papers for the topic.
 *
 * @param topic    - The research topic for the literature review
 * @param userId   - The authenticated user's ID
 * @param paperIds - Optional array of specific paper IDs to include
 * @returns Structured literature review with citations
 */
export async function generateReview(
  topic: string,
  userId: string,
  paperIds?: string[]
): Promise<LiteratureReview> {
  let papers;

  if (paperIds && paperIds.length > 0) {
    // Use specified papers
    papers = await Paper.find({ _id: { $in: paperIds }, userId }).lean();
  } else {
    // Find relevant papers via vector search
    const topicEmbedding = await generateEmbedding(topic);
    const searchResults = await searchVectors(topicEmbedding, userId, 10);

    // Get unique paper IDs from search results
    const uniquePaperIds = [...new Set(searchResults.map((r) => r.paperId.toString()))];
    papers = await Paper.find({ _id: { $in: uniquePaperIds } }).lean();
  }

  if (!papers || papers.length === 0) {
    throw new Error('No relevant papers found. Please upload papers related to the topic.');
  }

  const unreadyPapers = papers.filter((p) => p.status !== 'ready');
  if (unreadyPapers.length > 0) {
    throw new Error('Some relevant papers are still processing or failed to process. Please wait for them to finish.');
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
      return `PAPER ${i + 1}: "${paper.title}" (${paper.year || 'Year unknown'})
Authors: ${paper.authors?.join(', ') || 'Unknown'}
- Problem: ${summary.problemStatement}
- Methodology: ${summary.methodology}
- Results: ${summary.results}
- Limitations: ${summary.limitations}
- Future Work: ${summary.futureWork}`;
    })
    .join('\n\n');

  const prompt = `Generate a comprehensive literature review on the topic: "${topic}"

Use the following research papers as sources:

${papersContext}

Provide your response in EXACTLY this JSON format (no markdown, no code fences):
{
  "introduction": "An introduction to the research topic and its significance (4-6 sentences). Reference relevant papers.",
  "existingResearch": "A comprehensive review of existing research based on the provided papers (6-10 sentences). Cite specific papers by title.",
  "comparativeAnalysis": "A comparative analysis of different approaches and findings across the papers (5-8 sentences). Highlight similarities and differences.",
  "researchGaps": "Identified research gaps and areas that need further investigation (4-6 sentences). Base this on the limitations and future work sections of the papers.",
  "conclusion": "A concluding summary of the state of research on this topic (3-5 sentences)."
}`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: { temperature: 0.3 },
  });

  const responseText = response.text ?? '';
  return parseReviewResponse(responseText, topic, papers);
}

/**
 * Parses the Gemini response into a structured LiteratureReview.
 */
function parseReviewResponse(
  text: string,
  topic: string,
  papers: Array<{ _id: unknown; title: string }>
): LiteratureReview {
  const papersUsed = papers.map((p) => ({
    id: String(p._id),
    title: p.title,
  }));

  const defaultReview = {
    introduction: '',
    existingResearch: '',
    comparativeAnalysis: '',
    researchGaps: '',
    conclusion: '',
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { topic, papersUsed, review: { ...defaultReview, introduction: text.slice(0, 500) } };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      topic,
      papersUsed,
      review: {
        introduction: String(parsed.introduction ?? ''),
        existingResearch: String(parsed.existingResearch ?? ''),
        comparativeAnalysis: String(parsed.comparativeAnalysis ?? ''),
        researchGaps: String(parsed.researchGaps ?? ''),
        conclusion: String(parsed.conclusion ?? ''),
      },
    };
  } catch {
    return { topic, papersUsed, review: { ...defaultReview, introduction: text.slice(0, 500) } };
  }
}
