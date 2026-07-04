import type { Response } from 'express';
import { comparePapers } from '../services/compare.service.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Compare 2-5 research papers.
 * POST /api/compare
 * Body: { paperIds: string[] }
 */
export async function compare(req: AuthRequest, res: Response): Promise<void> {
  const { paperIds } = req.body as { paperIds?: string[] };

  if (!paperIds || !Array.isArray(paperIds)) {
    res.status(400).json({ error: 'paperIds array is required' });
    return;
  }

  if (paperIds.length < 2 || paperIds.length > 5) {
    res.status(400).json({ error: 'Please provide between 2 and 5 paper IDs' });
    return;
  }

  const result = await comparePapers(paperIds);

  res.json({ comparison: result });
}
