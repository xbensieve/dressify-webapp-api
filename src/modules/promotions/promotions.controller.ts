import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as promotionsService from './promotions.service';

/**
 * POST /api/promotions/vouchers/apply
 * Body: { code: string; orderAmount: number }
 *
 * Applies a voucher code against an order total.
 * Returns calculated discount and final payable amount.
 * Does NOT commit an order — caller must use the returned voucherId when
 * placing the final order to persist the usage record.
 */
export const applyVoucher = asyncHandler(async (req: Request, res: Response) => {
  const { code, orderAmount } = req.body as { code: string; orderAmount: number };

  const result = await promotionsService.applyVoucher(req.user!.id, code, orderAmount);

  res.status(200).json({
    success: true,
    message: 'Voucher applied successfully',
    data: result,
  });
});

/**
 * POST /api/promotions/flash-sales/reserve
 * Body: { variationId: string; quantity: number }
 *
 * Reserves flash-sale inventory for the authenticated user.
 * The reservation is temporary — the order service must call this first,
 * then atomically decrement ProductVariation stock within its own transaction.
 * On order failure, the caller is responsible for releasing the reservation
 * via the rollback path in FlashSaleRepository.releaseUnits().
 */
export const reserveFlashSaleItem = asyncHandler(async (req: Request, res: Response) => {
  const { variationId, quantity } = req.body as { variationId: string; quantity: number };

  const result = await promotionsService.reserveFlashSaleItem(
    req.user!.id,
    variationId,
    quantity,
  );

  res.status(200).json({
    success: true,
    message: 'Flash sale item reserved successfully',
    data: result,
  });
});
