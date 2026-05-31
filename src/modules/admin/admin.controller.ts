import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as adminService from './admin.service';

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await adminService.getAllUsers();
  res.status(200).json({ success: true, data: users });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const user = await adminService.updateUserStatus(req.params['id']!, status);
  res.status(200).json({ success: true, data: user });
});

export const getAllOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await adminService.getAllOrders();
  res.status(200).json({ success: true, data: orders });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { order_status } = req.body as { order_status: string };
  const order = await adminService.updateOrderStatus(req.params['id']!, order_status);
  res.status(200).json({ success: true, data: order });
});

export const getStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getStatistics();
  res.status(200).json({ success: true, data: stats });
});
