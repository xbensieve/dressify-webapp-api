import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Injects a unique request ID (X-Request-ID) into every incoming request.
 * Propagates existing ID from upstream proxies (e.g. nginx) if present.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'];
  const requestId = typeof existingId === 'string' ? existingId : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};
