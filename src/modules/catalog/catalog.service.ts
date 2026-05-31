import { redisClient } from '@infrastructure/cache/redis.client';
import { ProductRepository } from '@modules/products/products.repository';
import type { ProductWithDetails } from '@modules/products/products.repository';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('catalog.service');
const productRepository = new ProductRepository();

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum items kept in the Recently Viewed list per user.
 * Items beyond this cap are atomically evicted by ZREMRANGEBYRANK.
 */
const RECENTLY_VIEWED_MAX = 20;

/**
 * Redis key TTL in seconds.
 * A browsing session that goes cold for 30 days auto-expires its history.
 * This prevents unbounded key growth in Redis for inactive users.
 */
const RECENTLY_VIEWED_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Redis key namespace for recently viewed sorted sets. */
const rvKey = (userId: string) => `catalog:recently_viewed:${userId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecentlyViewedEntry {
  productId: string;
  viewedAt: number; // Unix timestamp (ms) — used as ZSet score
}

export interface RecentlyViewedResponse {
  items: ProductWithDetails[];
  total: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Record a product view in the user's Recently Viewed list.
 *
 * Redis Sorted Set strategy:
 *   Key   → `catalog:recently_viewed:{userId}`
 *   Score → Unix timestamp in milliseconds (Date.now())
 *   Member→ productId string
 *
 * Why Sorted Set?
 *   - ZADD NX: adds the member with the given score. If the member already
 *     exists (user viewed the same product twice), NX skips the insert — we
 *     then fall through to ZADD XX GT to UPDATE the score to the newer timestamp,
 *     effectively "bubbling" the re-viewed product to the front.
 *   - Score = timestamp → ZREVRANGE returns items newest-first for free.
 *   - ZREMRANGEBYRANK 0 -(MAX+1) atomically trims the set to MAX items AFTER
 *     every insertion, guaranteeing the cap without a separate COUNT query.
 *   - O(log N) per operation — constant-time regardless of history length.
 *   - TTL refresh on every view keeps active users' data alive.
 *
 * Pipeline rationale:
 *   A Redis pipeline batches ZADD + ZREMRANGEBYRANK + EXPIRE into a single
 *   network round-trip, reducing latency by ~2×.
 */
export const recordProductView = async (
  userId: string,
  productId: string,
): Promise<void> => {
  const key = rvKey(userId);
  const score = Date.now(); // millisecond timestamp as float score

  log.debug({ userId, productId, score }, 'Recording product view');

  // Use a pipeline to batch all three commands into one TCP round-trip
  const pipeline = redisClient.multi();

  // ZADD key GT score member
  //   GT: only update score if new score > existing (re-view refreshes position)
  //   CH: return count of added + updated members (not used, but consistent)
  // This handles the "re-view" case: if user visits same product again,
  // the GT flag updates the score to the newer timestamp, moving it to rank 0.
  pipeline.zAdd(key, { score, value: productId }, { GT: true });

  // Trim the sorted set to the MAX most recent items.
  // ZREMRANGEBYRANK removes all members with rank 0..(len - MAX - 1).
  // Ranks are 0-indexed from lowest score; negatives count from highest.
  // After ZADD, the set has at most (MAX+1) members — this removes the 1 oldest.
  // Equivalent to: ZREMRANGEBYRANK key 0 -(MAX+1)
  pipeline.zRemRangeByRank(key, 0, -(RECENTLY_VIEWED_MAX + 1));

  // Refresh TTL on every view — active users never lose their history
  pipeline.expire(key, RECENTLY_VIEWED_TTL_SECONDS);

  await pipeline.exec();

  log.debug({ userId, productId }, 'Product view recorded in Redis ZSet');
};

/**
 * Retrieve the user's Recently Viewed products, enriched with full product data.
 *
 * ZREVRANGE semantics:
 *   Sorted sets are ordered by score ascending. ZREVRANGE reverses this:
 *   rank 0 = highest score = most recently viewed item.
 *   `{ REV: true }` + `{ BY: 'SCORE', LIMIT: { offset: 0, count: limit } }`
 *   fetches the top N members in newest-first order.
 *
 * Enrichment strategy:
 *   We store only productIds in the ZSet — we do NOT store serialised product
 *   JSON because products change (price, stock). We resolve fresh product data
 *   from MongoDB using Promise.all on the IDs returned from Redis.
 *   Products that no longer exist (soft-deleted) are silently filtered out.
 */
export const getRecentlyViewedProducts = async (
  userId: string,
  limit = RECENTLY_VIEWED_MAX,
): Promise<RecentlyViewedResponse> => {
  const key = rvKey(userId);

  log.debug({ userId, limit }, 'Fetching recently viewed products');

  // ZRANGE key 0 (limit-1) BYSCORE REV → returns members newest-first
  // Using ZRANGE with REV:true is equivalent to ZREVRANGE (preferred in Redis 6.2+)
  const productIds = await redisClient.zRange(key, 0, limit - 1, { REV: true });

  if (!productIds.length) {
    log.debug({ userId }, 'No recently viewed products found');
    return { items: [], total: 0 };
  }

  log.debug({ userId, count: productIds.length }, 'Resolving product details from MongoDB');

  // Resolve products in parallel, filter out any that have been deleted
  const settled = await Promise.allSettled(
    productIds.map((id) => productRepository.findById(id)),
  );

  const items = settled
    .filter(
      (result): result is PromiseFulfilledResult<ProductWithDetails> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);

  log.debug({ userId, resolved: items.length, total: productIds.length }, 'Recently viewed resolved');

  return { items, total: items.length };
};

/**
 * Clear the user's recently viewed history (e.g., privacy/account deletion).
 */
export const clearRecentlyViewed = async (userId: string): Promise<void> => {
  await redisClient.del(rvKey(userId));
  log.info({ userId }, 'Recently viewed history cleared');
};

/**
 * Get the raw view history (productId + timestamp score) without MongoDB enrichment.
 * Useful for analytics pipelines that only need the activity stream, not product details.
 */
export const getRecentlyViewedRaw = async (
  userId: string,
): Promise<RecentlyViewedEntry[]> => {
  const key = rvKey(userId);

  // ZRANGE with WITHSCORES returns [{ value, score }] tuples
  const entries = await redisClient.zRangeWithScores(key, 0, -1, { REV: true });

  return entries.map(({ value, score }) => ({
    productId: value,
    viewedAt: score,
  }));
};
