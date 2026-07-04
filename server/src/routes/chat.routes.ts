import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  query,
  listSessions,
  getSession,
  deleteSession,
} from '../controllers/chat.controller.js';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

/** POST /api/chat/query — Ask a question using RAG */
router.post('/query', query);

/** GET /api/chat/sessions — List all chat sessions */
router.get('/sessions', listSessions);

/** GET /api/chat/sessions/:id — Get a specific chat session */
router.get('/sessions/:id', getSession);

/** DELETE /api/chat/sessions/:id — Delete a chat session */
router.delete('/sessions/:id', deleteSession);

export default router;
