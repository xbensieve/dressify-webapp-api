import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as usersService from './users.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { user, addresses } = await usersService.getProfile(userId);
  res.status(200).json({ success: true, user, addresses });
});
