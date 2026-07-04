import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

/**
 * Generate a JWT token for the given user ID.
 * Token expires in 24 hours, signed with HS256.
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
}

/**
 * Wraps an async route handler to forward rejected promises
 * to Express's error handler. Useful as a safety net even though
 * Express 5 handles promise rejections natively.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
