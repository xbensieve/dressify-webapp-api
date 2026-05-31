import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate.middleware';
import { applyVoucherSchema, reserveFlashSaleSchema } from './promotions.validation';
import * as promotionsController from './promotions.controller';

const router = Router();

// All promotion endpoints require authentication
router.use(verifyToken);

/**
 * @route   POST /api/promotions/vouchers/apply
 * @desc    Apply a voucher code to an order total
 * @access  Private
 */
router.post(
  '/vouchers/apply',
  validate({ body: applyVoucherSchema }),
  promotionsController.applyVoucher,
);

/**
 * @route   POST /api/promotions/flash-sales/reserve
 * @desc    Reserve flash-sale inventory (distributed lock protected)
 * @access  Private
 */
router.post(
  '/flash-sales/reserve',
  validate({ body: reserveFlashSaleSchema }),
  promotionsController.reserveFlashSaleItem,
);

export default router;
