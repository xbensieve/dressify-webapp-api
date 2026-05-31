import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@shared/logger/pino';
import { env } from '@shared/config/env';
import { ZodError } from 'zod';

/**
 * Centralized error handler.
 * - Operational AppErrors: send structured JSON with appropriate status
 * - ZodErrors: treat as validation errors (shouldn't reach here if validate middleware is used)
 * - Unknown errors: log full error, return generic 500 in production
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const requestId = req.requestId;

  // Handle Zod validation errors (unexpected path)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.flatten().fieldErrors,
      requestId,
    });
    return;
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, url: req.url, method: req.method }, err.message);
    } else {
      logger.warn({ requestId, code: err.code, url: req.url }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId,
    });
    return;
  }

  // Handle Mongoose duplicate key errors
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    const mongoErr = err as { keyValue?: Record<string, unknown> };
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : 'field';
    res.status(409).json({
      success: false,
      code: 'CONFLICT',
      message: `${field ?? 'A field'} already exists`,
      requestId,
    });
    return;
  }

  // Unknown / programmer errors
  logger.error({ err, requestId, url: req.url, method: req.method }, 'Unhandled error');

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : String(err),
    requestId,
  });
};
