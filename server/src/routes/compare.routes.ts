import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { compare } from '../controllers/compare.controller.js';

const router = Router();

// All compare routes require authentication
router.use(authenticate);

/** POST /api/compare — Compare 2-5 papers */
router.post('/', compare);

export default router;
