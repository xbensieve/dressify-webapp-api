import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as catalogController from './catalog.controller';

const router = Router();

// All catalog personalisation endpoints require authentication
router.use(verifyToken);

/**
 * @route   POST /api/catalog/recently-viewed
 * @desc    Record that the authenticated user viewed a product
 * @access  Private
 */
router.post('/recently-viewed', catalogController.trackProductView);

/**
 * @route   GET /api/catalog/recently-viewed
 * @desc    Retrieve the user's recently viewed products (newest first, max 20)
 * @query   limit?: number (1–20, default: 20)
 * @access  Private
 */
router.get('/recently-viewed', catalogController.getRecentlyViewed);

/**
 * @route   DELETE /api/catalog/recently-viewed
 * @desc    Clear the user's entire recently viewed history
 * @access  Private
 */
router.delete('/recently-viewed', catalogController.clearRecentlyViewed);

export default router;
