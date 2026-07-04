import type { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '../models/Chat.js';
import { runRAGPipeline } from '../services/rag.service.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Run a RAG query and save the conversation.
 * POST /api/chat/query
 * Body: { query, sessionId? }
 */
export async function query(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query: userQuery, sessionId: providedSessionId } = req.body as {
      query?: string;
      sessionId?: string;
    };

    if (!userQuery || userQuery.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const userId = req.userId!;
    const sessionId = providedSessionId || uuidv4();

    // Run RAG pipeline with graceful error handling
    let ragResponse;
    try {
      ragResponse = await runRAGPipeline(userQuery, userId);
    } catch (ragError: any) {
      const errMsg = String(ragError?.message || ragError || '');
      const isQuota = errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('limit');
      const isUnavailable = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');

      if (isQuota) {
        ragResponse = {
          answer: "⚠️ I'm currently rate-limited by the AI service (free tier quota exceeded). Please wait about 30–60 seconds and try again. Your papers are still saved and ready.",
          sources: [],
        };
      } else if (isUnavailable) {
        ragResponse = {
          answer: "⚠️ The AI service is temporarily unavailable due to high demand. Please try again in a few moments.",
          sources: [],
        };
      } else {
        ragResponse = {
          answer: "❌ Sorry, I encountered an error while processing your question. Please try again. If this persists, try uploading your papers again.",
          sources: [],
        };
        console.error('[Chat] RAG pipeline error:', ragError);
      }
    }

    // Find or create chat session
    let chat = await Chat.findOne({ sessionId, userId });

    if (!chat) {
      // Generate a title from the first query
      const title =
        userQuery.length > 60
          ? userQuery.slice(0, 57) + '...'
          : userQuery;

      chat = new Chat({
        userId,
        sessionId,
        title,
        messages: [],
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: userQuery,
      sources: [],
      timestamp: new Date(),
    });

    // Add assistant message with sources
    chat.messages.push({
      role: 'assistant',
      content: ragResponse.answer,
      sources: ragResponse.sources.map((s) => ({
        paperId: s.paperId as unknown as import('mongoose').Types.ObjectId,
        paperTitle: s.paperTitle,
        chunkText: s.chunkText,
        score: s.score,
      })),
      timestamp: new Date(),
    });

    await chat.save();

    res.json({
      sessionId,
      answer: ragResponse.answer,
      sources: ragResponse.sources,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all chat sessions for the authenticated user.
 * GET /api/chat/sessions
 */
export async function listSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await Chat.find({ userId: req.userId })
      .select('sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific chat session with full message history.
 * GET /api/chat/sessions/:id
 */
export async function getSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const chat = await Chat.findOne({
      sessionId: req.params.id,
      userId: req.userId,
    }).lean();

    if (!chat) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    res.json({ session: chat });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a chat session.
 * DELETE /api/chat/sessions/:id
 */
export async function deleteSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Chat.findOneAndDelete({
      sessionId: req.params.id,
      userId: req.userId,
    });

    if (!result) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    next(error);
  }
}

