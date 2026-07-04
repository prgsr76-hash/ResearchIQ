import type { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MulterError } from 'multer';

/** Structured error response body */
interface ErrorResponse {
  error: string;
  details?: Record<string, string>;
  statusCode: number;
}

/**
 * Centralized error-handling middleware.
 * Translates Mongoose, JWT, Multer, and generic errors into structured JSON responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message);

  let response: ErrorResponse = {
    error: 'Internal server error',
    statusCode: 500,
  };

  // --- Mongoose validation errors ---
  if (err instanceof MongooseError.ValidationError) {
    const details: Record<string, string> = {};
    for (const [field, validationErr] of Object.entries(err.errors)) {
      details[field] = validationErr.message;
    }
    response = {
      error: 'Validation failed',
      details,
      statusCode: 400,
    };
  }

  // --- Mongoose cast errors (invalid ObjectId, etc.) ---
  else if (err instanceof MongooseError.CastError) {
    response = {
      error: `Invalid ${err.path}: ${String(err.value)}`,
      statusCode: 400,
    };
  }

  // --- MongoDB duplicate key error ---
  else if (err.name === 'MongoServerError' && 'code' in err && (err as Record<string, unknown>).code === 11000) {
    const keyValue = (err as Record<string, unknown>).keyValue as Record<string, unknown> | undefined;
    const field = keyValue ? Object.keys(keyValue)[0] : 'field';
    response = {
      error: `Duplicate value for ${field}. This ${field} already exists.`,
      statusCode: 409,
    };
  }

  // --- JWT errors ---
  else if (err.name === 'JsonWebTokenError') {
    response = { error: 'Invalid token', statusCode: 401 };
  } else if (err.name === 'TokenExpiredError') {
    response = { error: 'Token expired', statusCode: 401 };
  }

  // --- Multer errors ---
  else if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File size exceeds the 20 MB limit',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FILE_COUNT: 'Too many files',
    };
    response = {
      error: messages[err.code] ?? err.message,
      statusCode: 400,
    };
  }

  // --- Generic errors with a message ---
  else if (err.message) {
    response = {
      error: err.message,
      statusCode: (err as unknown as Record<string, unknown>).statusCode as number ?? 500,
    };
  }

  res.status(response.statusCode).json({
    error: response.error,
    ...(response.details && { details: response.details }),
  });
}
