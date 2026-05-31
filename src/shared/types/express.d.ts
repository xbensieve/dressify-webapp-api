import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '@shared/types/jwt.types';

// Augment Express types globally
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      requestId: string;
    }
  }
}

// Re-export for convenience
export type { Request, Response, NextFunction };
