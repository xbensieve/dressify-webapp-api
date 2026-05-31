import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as paymentService from './payment.service';

export const generatePaymentUrl = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body as { orderId: string };
  const paymentUrl = await paymentService.generatePaymentUrl(orderId);
  res.json({ success: true, paymentUrl });
});

export const handlePaymentResponse = asyncHandler(async (req: Request, res: Response) => {
  const { redirectUrl } = await paymentService.handlePaymentResponse(
    req.query as Record<string, string>,
  );
  res.redirect(redirectUrl);
});
