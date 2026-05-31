import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express handler and forwards any thrown errors to next().
 * Eliminates try/catch boilerplate in controllers.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
