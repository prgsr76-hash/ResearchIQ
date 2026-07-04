import type { Response } from 'express';
import { analyzeGaps } from '../services/gap.service.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Analyze research gaps across a user's paper collection.
 * POST /api/gaps/analyze
 * Body: { paperIds?: string[] }
 */
export async function analyze(req: AuthRequest, res: Response): Promise<void> {
  const { paperIds } = req.body as { paperIds?: string[] };

  const userId = req.userId!;
  const analysis = await analyzeGaps(userId, paperIds);

  res.json({ analysis });
}
