import type { Response } from 'express';
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { Paper } from '../models/Paper.js';
import { Embedding } from '../models/Embedding.js';
import { extractTextFromPdf } from '../services/pdf.service.js';
import { chunkText } from '../services/chunking.service.js';
import { generateBatchEmbeddings } from '../services/embedding.service.js';
import { generateSummary } from '../services/summary.service.js';
import type { AuthRequest } from '../middleware/auth.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

/**
 * Upload a PDF paper, extract text, and trigger async processing.
 * POST /api/papers/upload
 */
export async function uploadPaper(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  const userId = req.userId!;
  const file = req.file;

  // Create paper record
  const paper = await Paper.create({
    userId,
    filename: file.filename,
    originalName: file.originalname,
    fileSize: file.size,
    status: 'uploading',
  });

  // Return immediately, process in background
  res.status(201).json({
    paper: {
      id: paper._id,
      originalName: paper.originalName,
      fileSize: paper.fileSize,
      status: paper.status,
      createdAt: paper.createdAt,
    },
    message: 'Paper uploaded. Processing will continue in the background.',
  });

  // --- Async processing via Queue ---
  addToQueue(paper._id.toString(), file.path, userId).catch((err) => {
    console.error(`[Paper] Queue enqueue failed for ${paper._id}:`, err);
  });
}

// Background processing queue types & storage
interface QueueTask {
  paperId: string;
  filePath: string;
  userId: string;
}

const processingQueue: QueueTask[] = [];
let isProcessingQueue = false;

async function addToQueue(paperId: string, filePath: string, userId: string): Promise<void> {
  processingQueue.push({ paperId, filePath, userId });
  triggerQueueProcessing();
}

async function triggerQueueProcessing(): Promise<void> {
  if (isProcessingQueue || processingQueue.length === 0) return;

  isProcessingQueue = true;
  const task = processingQueue.shift()!;

  console.log(`[Queue] Starting processing for paper ${task.paperId}. Remaining: ${processingQueue.length}`);

  try {
    await processInBackground(task.paperId, task.filePath, task.userId);
  } catch (err) {
    console.error(`[Queue] Error processing paper ${task.paperId}:`, err);
  } finally {
    console.log(`[Queue] Finished paper ${task.paperId}. Cooldown for 5 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    isProcessingQueue = false;
    triggerQueueProcessing();
  }
}

/**
 * Background processing pipeline: extract → metadata → chunk → embed → store.
 */
async function processInBackground(
  paperId: string,
  filePath: string,
  userId: string
): Promise<void> {

  try {
    // Update status
    await Paper.findByIdAndUpdate(paperId, {
      status: 'processing',
      processingProgress: 10,
    });

    // 1. Extract text from PDF
    const { text, pageCount, metadata } = await extractTextFromPdf(filePath);

    await Paper.findByIdAndUpdate(paperId, {
      fullText: text,
      pageCount,
      processingProgress: 30,
    });

    // 2. Extract metadata with Gemini
    const extractedMeta = await extractMetadataWithGemini(text, metadata.title);

    await Paper.findByIdAndUpdate(paperId, {
      title: extractedMeta.title,
      authors: extractedMeta.authors,
      abstract: extractedMeta.abstract,
      year: extractedMeta.year,
      keywords: extractedMeta.keywords,
      processingProgress: 50,
    });

    // 3. Chunk text
    const chunks = chunkText(text, pageCount);

    await Paper.findByIdAndUpdate(paperId, {
      processingProgress: 60,
    });

    // 4. Generate embeddings
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await generateBatchEmbeddings(chunkTexts);

    await Paper.findByIdAndUpdate(paperId, {
      processingProgress: 85,
    });

    // 5. Store embeddings
    const embeddingDocs = chunks.map((chunk, i) => ({
      paperId,
      userId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: embeddings[i],
      metadata: {
        pageNumber: chunk.estimatedPage,
        section: '',
      },
    }));

    await Embedding.insertMany(embeddingDocs);

    // 6. Mark as ready
    await Paper.findByIdAndUpdate(paperId, {
      status: 'ready',
      processingProgress: 100,
    });

    console.log(`[Paper] Processing complete for ${paperId}`);
  } catch (error) {
    console.error(`[Paper] Processing error for ${paperId}:`, error);
    await Paper.findByIdAndUpdate(paperId, {
      status: 'error',
    });
  }
}

/**
 * Uses Gemini to extract structured metadata from paper text.
 */
async function extractMetadataWithGemini(
  text: string,
  pdfTitle: string
): Promise<{
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  keywords: string[];
}> {
  const snippet = text.slice(0, 3000);

  const prompt = `Extract metadata from this academic paper text. If the PDF title is available, consider it: "${pdfTitle}"

TEXT:
${snippet}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "title": "The paper title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "The abstract text",
  "year": 2024,
  "keywords": ["keyword1", "keyword2"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.1 },
    });

    const responseText = response.text ?? '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        title: String(parsed.title ?? pdfTitle ?? 'Untitled Paper'),
        authors: Array.isArray(parsed.authors) ? (parsed.authors as string[]) : [],
        abstract: String(parsed.abstract ?? ''),
        year: Number(parsed.year) || new Date().getFullYear(),
        keywords: Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : [],
      };
    }
  } catch (error) {
    console.warn('[Paper] Metadata extraction failed, using defaults:', error);
  }

  return {
    title: pdfTitle || 'Untitled Paper',
    authors: [],
    abstract: '',
    year: new Date().getFullYear(),
    keywords: [],
  };
}

/**
 * List all papers for the authenticated user.
 * GET /api/papers
 */
export async function listPapers(req: AuthRequest, res: Response): Promise<void> {
  const papersRaw = await Paper.find({ userId: req.userId })
    .select('-fullText -summary')
    .sort({ createdAt: -1 })
    .lean();

  const papers = papersRaw.map((p) => ({
    ...p,
    id: p._id.toString(),
  }));

  res.json({ papers });
}

/**
 * Get a single paper by ID.
 * GET /api/papers/:id
 */
export async function getPaperById(req: AuthRequest, res: Response): Promise<void> {
  const paperRaw = await Paper.findOne({
    _id: req.params.id,
    userId: req.userId,
  }).lean();

  if (!paperRaw) {
    res.status(404).json({ error: 'Paper not found' });
    return;
  }

  const paper = {
    ...paperRaw,
    id: paperRaw._id.toString(),
  };

  res.json({ paper });
}

/**
 * Delete a paper and all its embeddings.
 * DELETE /api/papers/:id
 */
export async function deletePaper(req: AuthRequest, res: Response): Promise<void> {
  const paper = await Paper.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!paper) {
    res.status(404).json({ error: 'Paper not found' });
    return;
  }

  // Delete associated embeddings
  await Embedding.deleteMany({ paperId: paper._id });

  // Try to delete the file from disk
  if (paper.filename) {
    try {
      await fs.unlink(`uploads/${paper.filename}`);
    } catch {
      // File may already be deleted — non-critical
    }
  }

  await Paper.findByIdAndDelete(paper._id);

  res.json({ message: 'Paper and associated data deleted successfully' });
}

/**
 * Get or generate a structured summary for a paper.
 * GET /api/papers/:id/summary
 */
export async function getPaperSummary(req: AuthRequest, res: Response): Promise<void> {
  const paper = await Paper.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!paper) {
    res.status(404).json({ error: 'Paper not found' });
    return;
  }

  if (paper.status !== 'ready') {
    res.status(400).json({
      error: 'Paper is still being processed. Please wait until processing is complete.',
    });
    return;
  }

  const summary = await generateSummary(paper._id.toString());

  res.json({
    paperId: paper._id,
    title: paper.title,
    summary,
  });
}
