import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as addressesService from './addresses.service';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await addressesService.getUserAddresses(req.user!.id);
  res.status(200).json({ success: true, data: addresses });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.createAddress(req.user!.id, req.body);
  res.status(201).json({ success: true, data: address });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.updateAddress(req.user!.id, req.params['id']!, req.body);
  res.status(200).json({ success: true, data: address });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await addressesService.deleteAddress(req.user!.id, req.params['id']!);
  res.status(200).json({ success: true, message: 'Address deleted' });
});

export const setDefault = asyncHandler(async (req: Request, res: Response) => {
  await addressesService.setDefaultAddress(req.user!.id, req.params['id']!);
  res.status(200).json({ success: true, message: 'Default address updated' });
});
