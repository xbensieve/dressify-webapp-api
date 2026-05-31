import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '@shared/config/env';
import { UnauthorizedError, ForbiddenError } from '@shared/errors/AppError';
import type { JwtPayload, UserRole } from '@shared/types/jwt.types';
import { cacheService } from '@infrastructure/cache/cache.service';

/**
 * Verifies JWT access token and attaches decoded payload to req.user.
 * Also checks the token blacklist (Redis) for revoked tokens.
 */
export const verifyToken = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return next(new UnauthorizedError('Empty token provided'));
  }

  try {
    // Check token blacklist
    const isBlacklisted = await cacheService.get<boolean>(`blacklist:${token}`);
    if (isBlacklisted) {
      return next(new UnauthorizedError('Token has been revoked'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    next(error);
  }
};

/**
 * RBAC middleware factory — restricts access to specific roles.
 * Must be used AFTER verifyToken.
 */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access restricted to: ${roles.join(', ')}`));
    }
    next();
  };

/** Convenience alias for admin-only routes */
export const requireAdmin = requireRole('admin');

/** Convenience alias for seller or admin routes */
export const requireSeller = requireRole('seller', 'admin');
