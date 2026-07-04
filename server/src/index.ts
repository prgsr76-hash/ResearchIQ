import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import paperRoutes from './routes/paper.routes.js';
import chatRoutes from './routes/chat.routes.js';
import compareRoutes from './routes/compare.routes.js';
import reviewRoutes from './routes/review.routes.js';
import gapRoutes from './routes/gap.routes.js';

/**
 * Bootstrap the Express application:
 * - Connect to MongoDB
 * - Apply global middleware
 * - Mount API routes
 * - Start listening
 */
async function main(): Promise<void> {
  // Ensure uploads directory exists
  const uploadsDir = path.resolve('uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[Server] Created uploads/ directory');
  }

  // Connect to MongoDB
  await connectDB();

  const app = express();

  // --- Global middleware ---
  app.use(helmet());
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- Health check ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- API routes ---
  app.use('/api/auth', authRoutes);
  app.use('/api/papers', paperRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/compare', compareRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/gaps', gapRoutes);

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  // --- Start server ---
  app.listen(config.PORT, () => {
    console.log(`[Server] ResearchIQ API running on http://localhost:${config.PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
