import { redisClient } from './redis.client';
import { logger } from '@shared/logger/pino';

/**
 * Generic cache abstraction over Redis.
 * All methods are type-safe. Data is JSON-serialized.
 */
export const cacheService = {
  /**
   * Get a value from cache. Returns null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redisClient.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL (seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (err) {
      logger.warn({ err, key }, 'Cache set failed');
    }
  },

  /**
   * Delete a cache key.
   */
  async del(...keys: string[]): Promise<void> {
    try {
      for (const key of keys) {
        await redisClient.del(key);
      }
    } catch (err) {
      logger.warn({ err, keys }, 'Cache del failed');
    }
  },

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const count = await redisClient.exists(key);
      return count > 0;
    } catch (err) {
      logger.warn({ err, key }, 'Cache exists check failed');
      return false;
    }
  },

  /**
   * Set expiry on an existing key.
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redisClient.expire(key, ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Cache expire failed');
    }
  },

  /**
   * Invalidate all keys matching a pattern.
   * Use sparingly — SCAN is safe but can be slow with large keysets.
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        if (typeof key === 'string') keys.push(key);
        else if (Array.isArray(key)) keys.push(...(key as string[]));
      }
      if (keys.length > 0) {
        for (const key of keys) {
          await redisClient.del(key);
        }
        logger.debug({ pattern, count: keys.length }, 'Cache invalidated by pattern');
      }
    } catch (err) {
      logger.warn({ err, pattern }, 'Cache invalidation by pattern failed');
    }
  },

  /**
   * Blacklist a JWT token until its expiry time.
   */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${token}`, true, ttlSeconds);
  },
};
