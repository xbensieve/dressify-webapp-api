import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import * as authService from './auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  await authService.registerUser(req.body);
  res.status(201).json({
    success: true,
    message:
      'Registration successful. A confirmation code has been sent to your email.',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.loginUser(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
});

export const loginGoogle = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.loginWithGoogle(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.query as { email: string; code: string };
  await authService.activateAccount(email, code);
  res.send('Account activated successfully! You can now log in.');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body as { refresh_token: string };
  const accessToken = await authService.refreshAccessToken(refresh_token);
  res.status(200).json({ success: true, access_token: accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  const { refresh_token } = req.body as { refresh_token?: string };
  await authService.logoutUser(accessToken, refresh_token);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});
