import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as cartService from './cart.service';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const data = await cartService.getCart(req.user!.id);
  res.status(200).json({ success: true, data: { cart: data } });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, variationId, quantity } = req.body as {
    productId: string; variationId: string; quantity: number;
  };
  const data = await cartService.addToCart(req.user!.id, productId, variationId, quantity);
  res.status(200).json({ success: true, data: { cart: data } });
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity: number };
  const data = await cartService.updateCartItem(req.user!.id, req.params['cartItemId']!, quantity);
  res.status(200).json({ success: true, data: { cart: data } });
});

export const deleteCartItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await cartService.deleteCartItem(req.user!.id, req.params['cartItemId']!);
  res.status(200).json({ success: true, data: { cart: data } });
});
