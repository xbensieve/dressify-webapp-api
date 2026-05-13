import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { BadRequestError } from '@shared/errors/AppError';
import * as productsService from './products.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  if (!req.query['keyword']) throw new BadRequestError('Please provide search parameters');
  const result = await productsService.searchProducts(req.query as Record<string, unknown>);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.body as { id: string };
  const product = await productsService.getProductById(id);
  res.status(200).json({ success: true, data: product });
});

export const addProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = JSON.parse(req.body.product as string) as Record<string, unknown>;
  const variations = JSON.parse(req.body.variations as string) as Record<string, unknown>[];
  const files = (req.files as Express.Multer.File[]) ?? [];

  const data = await productsService.addProduct(req.user!.id, product, variations, files);
  res.status(201).json({ success: true, message: 'Product added successfully', data });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.updateProduct(req.params['id']!, req.body as Record<string, unknown>);
  res.status(200).json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productsService.deleteProduct(req.params['id']!);
  res.status(200).json({ success: true, message: 'Product deleted' });
});
