import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  uploadPaper,
  listPapers,
  getPaperById,
  deletePaper,
  getPaperSummary,
} from '../controllers/paper.controller.js';

const router = Router();

// All paper routes require authentication
router.use(authenticate);

/** POST /api/papers/upload — Upload a PDF paper */
router.post('/upload', upload.single('file'), uploadPaper);

/** GET /api/papers — List all papers for the user */
router.get('/', listPapers);

/** GET /api/papers/:id — Get a specific paper */
router.get('/:id', getPaperById);

/** DELETE /api/papers/:id — Delete a paper and its embeddings */
router.delete('/:id', deletePaper);

/** GET /api/papers/:id/summary — Get or generate a paper summary */
router.get('/:id/summary', getPaperSummary);

export default router;
