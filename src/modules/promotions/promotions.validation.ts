import { z } from 'zod';

export const applyVoucherSchema = z.object({
  code: z
    .string({ required_error: 'Voucher code is required' })
    .min(3, 'Voucher code must be at least 3 characters')
    .max(32, 'Voucher code too long')
    .trim()
    .toUpperCase(),
  orderAmount: z
    .number({ required_error: 'orderAmount is required' })
    .positive('orderAmount must be a positive number'),
});

export const reserveFlashSaleSchema = z.object({
  variationId: z
    .string({ required_error: 'variationId is required' })
    .regex(/^[a-f\d]{24}$/i, 'variationId must be a valid MongoDB ObjectId'),
  quantity: z
    .number({ required_error: 'quantity is required' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .max(100, 'Cannot reserve more than 100 items at once'),
});

export type ApplyVoucherDto = z.infer<typeof applyVoucherSchema>;
export type ReserveFlashSaleDto = z.infer<typeof reserveFlashSaleSchema>;
