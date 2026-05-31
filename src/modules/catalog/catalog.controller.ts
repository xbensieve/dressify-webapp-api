import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { BadRequestError } from '@shared/errors/AppError';
import * as catalogService from './catalog.service';

/**
 * POST /api/catalog/recently-viewed
 * Body: { productId: string }
 *
 * Records that the authenticated user has viewed a product.
 * Called client-side when a product detail page renders (or on significant
 * scroll dwell time). Fire-and-forget in UX, but awaited server-side for
 * correctness — the response is fast since it's a Redis write only.
 *
 * Design note: This is a POST rather than GET because it mutates state
 * (Redis ZSet). A GET with side-effects would violate HTTP semantics and
 * would be cached by CDNs/proxies.
 */
export const trackProductView = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body as { productId?: string };

  if (!productId || !/^[a-f\d]{24}$/i.test(productId)) {
    throw new BadRequestError('productId must be a valid MongoDB ObjectId');
  }

  await catalogService.recordProductView(req.user!.id, productId);

  res.status(200).json({
    success: true,
    message: 'Product view recorded',
  });
});

/**
 * GET /api/catalog/recently-viewed
 * Query: { limit?: number }
 *
 * Returns the authenticated user's Recently Viewed products (newest first),
 * enriched with full product details from MongoDB.
 * Items are capped at 20 by the service layer (ZREMRANGEBYRANK).
 *
 * The response is intentionally NOT cached (no Cache-Control max-age):
 *   - This endpoint reads fresh MongoDB data for each product.
 *   - Each user has a unique, personalised view history.
 *   - Products may change price/stock between views.
 */
export const getRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
  const rawLimit = req.query['limit'];
  const limit = rawLimit ? Math.min(Number(rawLimit), 20) : 20;

  if (isNaN(limit) || limit < 1) {
    throw new BadRequestError('limit must be a positive integer up to 20');
  }

  const result = await catalogService.getRecentlyViewedProducts(req.user!.id, limit);

  res.status(200).json({
    success: true,
    data: result.items,
    total: result.total,
  });
});

/**
 * DELETE /api/catalog/recently-viewed
 *
 * Clears the user's entire view history (GDPR / privacy request).
 */
export const clearRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
  await catalogService.clearRecentlyViewed(req.user!.id);

  res.status(200).json({
    success: true,
    message: 'Recently viewed history cleared',
  });
});
