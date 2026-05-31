import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as categoriesService from './categories.service';

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoriesService.getAllCategories();
  res.status(200).json({ success: true, data: categories });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoriesService.getCategoryById(req.params['id']!);
  res.status(200).json({ success: true, data: category });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body as { name: string; description?: string };
  const category = await categoriesService.createCategory(name, description);
  res.status(201).json({ success: true, data: category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoriesService.updateCategory(req.params['id']!, req.body);
  res.status(200).json({ success: true, data: category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await categoriesService.deleteCategory(req.params['id']!);
  res.status(200).json({ success: true, message: 'Category deleted' });
});
