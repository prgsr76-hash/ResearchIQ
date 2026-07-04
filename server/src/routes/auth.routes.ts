import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** POST /api/auth/register — Create a new account */
router.post('/register', register);

/** POST /api/auth/login — Authenticate and get a token */
router.post('/login', login);

/** GET /api/auth/me — Get current user profile (protected) */
router.get('/me', authenticate, getMe);

export default router;
