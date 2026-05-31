import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@shared/errors/AppError';

export interface ValidateSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Validates request parts against Zod schemas.
 * Attaches parsed (typed) data back to req.body / req.params / req.query.
 */
export const validate =
  (schemas: ValidateSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors['body'] = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors['params'] = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors['query'] = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.query = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
