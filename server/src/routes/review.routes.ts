import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { generate } from '../controllers/review.controller.js';

const router = Router();

// All review routes require authentication
router.use(authenticate);

/** POST /api/review/generate — Generate a literature review */
router.post('/generate', generate);

export default router;
