import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { analyze } from '../controllers/gap.controller.js';

const router = Router();

// All gap routes require authentication
router.use(authenticate);

/** POST /api/gaps/analyze — Analyze research gaps */
router.post('/analyze', analyze);

export default router;
