import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { TransactionModel } from './transactions.schema';

export const getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await TransactionModel.find()
    .populate({ path: 'order_id', match: { user_id: req.user!.id } })
    .lean();

  const filtered = transactions.filter((t) => t.order_id !== null);
  res.status(200).json({ success: true, data: filtered });
});
