import type { Response } from 'express';
import { generateReview } from '../services/review.service.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Generate a literature review on a topic.
 * POST /api/review/generate
 * Body: { topic, paperIds?: string[] }
 */
export async function generate(req: AuthRequest, res: Response): Promise<void> {
  const { topic, paperIds } = req.body as {
    topic?: string;
    paperIds?: string[];
  };

  if (!topic || topic.trim().length === 0) {
    res.status(400).json({ error: 'Topic is required' });
    return;
  }

  const userId = req.userId!;
  const review = await generateReview(topic, userId, paperIds);

  res.json({ review });
}
