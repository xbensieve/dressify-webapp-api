import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import * as redisModule from '@infrastructure/cache/redis.client';
import { env } from '@shared/config/env';
import type { Request, Response, NextFunction } from 'express';

/**
 * Build a rate-limit middleware whose RedisStore is created lazily on the
 * FIRST actual HTTP request, not at module evaluation time.
 *
 * Route modules are evaluated before `connectRedis()` resolves in server.ts,
 * so `redisClient` is `undefined` at import time. By deferring `new RedisStore`
 * until the first request we guarantee the client is already connected.
 */
const buildLimiter = (opts: Partial<Options>): RateLimitRequestHandler => {
  let limiter: RateLimitRequestHandler | undefined;

  const getInstance = (): RateLimitRequestHandler => {
    if (!limiter) {
      const store =
        env.NODE_ENV !== 'test'
          ? new RedisStore({
              sendCommand: (...args: string[]) =>
                redisModule.redisClient.sendCommand(args as [string, ...string[]]),
              prefix: 'rl:',
            })
          : undefined;

      limiter = rateLimit({ standardHeaders: true, legacyHeaders: false, store, ...opts });
    }
    return limiter;
  };

  // Proxy middleware that delegates to the lazily-created limiter
  const handler = (req: Request, res: Response, next: NextFunction) =>
    getInstance()(req, res, next);

  // Forward the extra properties `RateLimitRequestHandler` requires
  Object.defineProperty(handler, 'resetKey', {
    get: () => getInstance().resetKey,
  });
  Object.defineProperty(handler, 'getKey', {
    get: () => getInstance().getKey,
  });

  return handler as unknown as RateLimitRequestHandler;
};

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** General API rate limiter — 100 req / 15 min per IP */
export const apiLimiter = buildLimiter({
  windowMs: WINDOW_MS,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Strict auth limiter — 20 req / 15 min (login, register) */
export const authLimiter = buildLimiter({
  windowMs: WINDOW_MS,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

/** Upload limiter — 30 req / 15 min */
export const uploadLimiter = buildLimiter({
  windowMs: WINDOW_MS,
  max: 30,
  message: { success: false, message: 'Too many upload requests, please try again later.' },
});
