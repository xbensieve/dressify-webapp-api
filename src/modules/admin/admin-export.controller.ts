import type { Request, Response, NextFunction } from 'express';
import { exportOrdersQuerySchema, streamOrdersCsv } from './admin-export.service';
import { ValidationError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('admin-export.controller');

/**
 * GET /api/v1/admin/export/orders
 *
 * Query params (all optional):
 *   status    — "pending" | "completed" | "cancelled"
 *   from      — ISO 8601 datetime  (e.g. 2025-01-01T00:00:00Z)
 *   to        — ISO 8601 datetime
 *   sellerId  — MongoDB ObjectId (not yet applied — reserved for multi-tenant)
 *
 * Why this controller does NOT use asyncHandler:
 *   asyncHandler wraps a promise and calls next(err) on rejection.
 *   For streaming responses, headers are already committed once the pipeline
 *   starts — calling next(err) at that point would attempt to write a JSON
 *   error body on top of an already-streamed CSV, resulting in a malformed
 *   HTTP response. Instead we:
 *     1. Validate synchronously before committing headers.
 *     2. Let the service handle mid-stream errors (it destroys the response).
 *     3. Call next(err) ONLY for pre-stream validation/AppError failures.
 */
export const exportOrdersCsv = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // ── 1. Parse & validate query params BEFORE opening the stream ────────────
  const parsed = exportOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    return next(new ValidationError('Invalid export query parameters', details));
  }

  log.info(
    { adminId: req.user?.id, query: parsed.data },
    'Admin export: order CSV stream initiated',
  );

  try {
    // ── 2. Delegate to service — headers are set inside, pipeline runs here ──
    await streamOrdersCsv(parsed.data, res);
  } catch (err) {
    // This catch block fires only for pre-pipeline failures (e.g., DB connection
    // error before the first document). If headers are already sent, next(err)
    // cannot write a JSON body — Express will log it and close the socket.
    next(err);
  }
};
