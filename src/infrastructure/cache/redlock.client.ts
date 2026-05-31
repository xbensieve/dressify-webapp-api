import { randomBytes } from 'crypto';
import { redisClient } from './redis.client';
import { logger } from '@shared/logger/pino';

/**
 * Native Redlock-pattern Distributed Lock using node-redis (SET NX PX + Lua).
 *
 * Why native instead of the `redlock` npm package?
 *   The `redlock` package requires ioredis. This project uses `node-redis` (redis v4+),
 *   so we implement the identical Redlock algorithm directly:
 *
 *     ACQUIRE: SET key token NX PX ttlMs
 *       → Atomic: sets only if key does not exist (NX), with TTL (PX).
 *       → Returns token on success, null if already locked.
 *
 *     RELEASE: Lua script — only deletes if the value matches our token.
 *       → Prevents a process from releasing a lock it no longer owns
 *         (i.e., one that expired and was re-acquired by another process).
 *
 * This satisfies the three Redlock safety properties:
 *   1. Mutual exclusion — only one holder at a time.
 *   2. Deadlock-free — TTL guarantees eventual release even on crash.
 *   3. Fault tolerance — (single-node here; extend to cluster for multi-node).
 */

// Lua script: delete key only if value matches (compare-and-delete, atomic)
const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export interface DistributedLock {
  key: string;
  token: string;
  /** Release the lock. Safe to call even if the lock has already expired. */
  release(): Promise<void>;
}

export class LockAcquisitionError extends Error {
  constructor(key: string) {
    super(`Failed to acquire distributed lock on key: "${key}" — resource is busy`);
    this.name = 'LockAcquisitionError';
  }
}

interface AcquireOptions {
  /** Lock TTL in milliseconds. Must be > worst-case critical section duration. */
  ttlMs: number;
  /** Number of retry attempts after the initial attempt. Default: 5 */
  retryCount?: number;
  /** Base delay in ms between retries. Default: 150 */
  retryDelayMs?: number;
  /** Max jitter in ms added to retry delay (reduces thundering herd). Default: 50 */
  jitterMs?: number;
}

/**
 * Acquire a distributed lock on `key`.
 *
 * @throws {LockAcquisitionError} if all retry attempts are exhausted.
 */
export const acquireLock = async (
  key: string,
  opts: AcquireOptions,
): Promise<DistributedLock> => {
  const { ttlMs, retryCount = 5, retryDelayMs = 150, jitterMs = 50 } = opts;

  // Unique token — proves ownership; prevents foreign releases
  const token = randomBytes(20).toString('hex');

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    const result = await redisClient.set(key, token, {
      NX: true,   // Only SET if Not eXists
      PX: ttlMs,  // Expire in ttlMs milliseconds
    });

    if (result === 'OK') {
      logger.debug({ key, attempt }, 'Distributed lock acquired');

      return {
        key,
        token,
        release: async () => {
          try {
            await redisClient.eval(RELEASE_SCRIPT, {
              keys: [key],
              arguments: [token],
            });
            logger.debug({ key }, 'Distributed lock released');
          } catch (err) {
            // Non-fatal: lock will auto-expire via TTL
            logger.error({ err, key }, 'Distributed lock release failed (will expire via TTL)');
          }
        },
      };
    }

    if (attempt < retryCount) {
      const delay = retryDelayMs + Math.floor(Math.random() * jitterMs);
      logger.debug({ key, attempt, delay }, 'Lock contention — retrying after delay');
      await sleep(delay);
    }
  }

  logger.warn({ key, retryCount }, 'Failed to acquire distributed lock after all retries');
  throw new LockAcquisitionError(key);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
