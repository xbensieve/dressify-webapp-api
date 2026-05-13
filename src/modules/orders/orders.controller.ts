import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as ordersService from './orders.service';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { products } = req.body as { products: Array<{ _id: string; product_id: string; price: number; quantity: number }> };
  const result = await ordersService.createOrder(req.user!.id, products);
  res.status(200).json({ success: true, message: 'Order created successfully', ...result });
});

export const createOrderFromCart = asyncHandler(async (req: Request, res: Response) => {
  const { cartItemIds } = req.body as { cartItemIds: string[] };
  const result = await ordersService.createOrderFromCart(req.user!.id, cartItemIds);
  res.status(200).json({ success: true, message: 'Order created and cart items removed', ...result });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await ordersService.getOrdersByUser(req.user!.id, req.query as Record<string, unknown>);
  res.status(200).json({ success: true, ...data });
});
