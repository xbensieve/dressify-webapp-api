/**
 * Unit Tests — Catalog Service (Recently Viewed / Redis ZSet)
 *
 * All mock state including the MockZSet class lives inside vi.hoisted()
 * because vi.hoisted() is executed before ANY module-level code runs —
 * so top-level class/const definitions are NOT available inside it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted: everything needed by vi.mock factories ───────────────────────

const {
  zsets,
  getZSet,
  mockRedisMulti,
  mockZRange,
  mockDel,
  mockExpire,
  buildPipelineMock,
  MOCK_PRODUCTS,
  registerMockProduct,
} = vi.hoisted(() => {
  // ── MockZSet class (must live here, not at file level) ─────────────────────
  class MockZSet {
    store = new Map<string, number>();

    zAdd(member: string, score: number, opts: { GT?: boolean } = {}) {
      if (opts.GT) {
        const existing = this.store.get(member);
        if (existing === undefined || score > existing) this.store.set(member, score);
      } else {
        this.store.set(member, score);
      }
    }

    zRemRangeByRank(start: number, stop: number) {
      const sorted = [...this.store.entries()].sort(([, a], [, b]) => a - b);
      const len = sorted.length;
      const endIdx = stop < 0 ? len + stop : stop;
      if (endIdx < start) return; // nothing to remove
      for (const [member] of sorted.slice(start, endIdx + 1)) this.store.delete(member);
    }

    zRange(start: number, stop: number, opts: { REV?: boolean } = {}): string[] {
      let sorted = [...this.store.entries()].sort(([, a], [, b]) => a - b);
      if (opts.REV) sorted = sorted.reverse();
      const len = sorted.length;
      const endIdx = stop < 0 ? len + stop : Math.min(stop, len - 1);
      if (endIdx < start) return [];
      return sorted.slice(start, endIdx + 1).map(([m]) => m);
    }

    size() { return this.store.size; }
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const zsets = new Map<string, InstanceType<typeof MockZSet>>();
  const getZSet = (key: string) => {
    if (!zsets.has(key)) zsets.set(key, new MockZSet());
    return zsets.get(key)!;
  };

  const MOCK_PRODUCTS: Record<string, { _id: string; name: string; price: number; isDeleted: boolean }> = {};
  const registerMockProduct = (id: string, isDeleted = false) => {
    MOCK_PRODUCTS[id] = { _id: id, name: `P${id}`, price: 100, isDeleted };
  };

  // ── Pipeline builder ──────────────────────────────────────────────────────
  type CapturedOp = { op: string; args: unknown[] };
  const buildPipelineMock = (ops: CapturedOp[]): Record<string, unknown> => ({
    zAdd: vi.fn().mockImplementation(
      (k: string, entry: { score: number; value: string }, opts?: { GT?: boolean }) => {
        ops.push({ op: 'zAdd', args: [k, entry, opts ?? {}] });
        return buildPipelineMock(ops);
      },
    ),
    zRemRangeByRank: vi.fn().mockImplementation((k: string, start: number, stop: number) => {
      ops.push({ op: 'zRemRangeByRank', args: [k, start, stop] });
      return buildPipelineMock(ops);
    }),
    expire: vi.fn().mockImplementation((k: string, ttl: number) => {
      ops.push({ op: 'expire', args: [k, ttl] });
      return buildPipelineMock(ops);
    }),
    exec: vi.fn().mockImplementation(async () => {
      for (const { op, args } of ops) {
        const key = args[0] as string;
        const zset = getZSet(key);
        if (op === 'zAdd') {
          const entry = args[1] as { score: number; value: string };
          const opts = args[2] as { GT?: boolean };
          zset.zAdd(entry.value, entry.score, opts);
        } else if (op === 'zRemRangeByRank') {
          zset.zRemRangeByRank(args[1] as number, args[2] as number);
        }
      }
      return [];
    }),
  });

  // ── Redis mock fns ─────────────────────────────────────────────────────────
  const mockExpire = vi.fn().mockResolvedValue(1);
  const mockDel = vi.fn().mockImplementation(async (key: string) => {
    zsets.delete(key);
    return 1;
  });
  const mockRedisMulti = vi.fn().mockImplementation(() => buildPipelineMock([]));
  const mockZRange = vi.fn().mockImplementation(
    async (key: string, start: number, stop: number, opts?: { REV?: boolean }) =>
      getZSet(key).zRange(start, stop, opts ?? {}),
  );

  return {
    zsets, getZSet, mockRedisMulti, mockZRange, mockDel, mockExpire,
    buildPipelineMock, MOCK_PRODUCTS, registerMockProduct,
  };
});

// ── vi.mock (uses hoisted vars) ───────────────────────────────────────────────

vi.mock('@infrastructure/cache/redis.client.js', () => ({
  redisClient: { multi: mockRedisMulti, zRange: mockZRange, del: mockDel, expire: mockExpire },
}));

vi.mock('@modules/products/products.repository.js', () => ({
  ProductRepository: class {
    async findById(id: string) {
      const p = MOCK_PRODUCTS[id];
      if (!p || p.isDeleted) throw new Error(`Product ${id} not found`);
      return p;
    }
  },
}));

import * as catalogService from '@modules/catalog/catalog.service';

// ── Shared helpers ────────────────────────────────────────────────────────────

const pid = (n: number) => `507f1f77bcf86cd79943${String(n).padStart(4, '0')}`;
const USER_A = '507f1f77bcf86cd799430001';

const resetMocks = () => {
  zsets.clear();
  vi.clearAllMocks();
  mockRedisMulti.mockImplementation(() => buildPipelineMock([]));
  mockZRange.mockImplementation(
    async (key: string, start: number, stop: number, opts?: { REV?: boolean }) =>
      getZSet(key).zRange(start, stop, opts ?? {}),
  );
  mockDel.mockImplementation(async (key: string) => { zsets.delete(key); return 1; });
};

// ── recordProductView ─────────────────────────────────────────────────────────

describe('CatalogService — recordProductView', () => {
  beforeEach(resetMocks);

  it('should add a product to the ZSet with current timestamp as score', async () => {
    const id = pid(1);
    const before = Date.now();
    await catalogService.recordProductView(USER_A, id);
    const after = Date.now();

    const score = getZSet(`catalog:recently_viewed:${USER_A}`).store.get(id);
    expect(score).toBeGreaterThanOrEqual(before);
    expect(score).toBeLessThanOrEqual(after);
  });

  it('should batch ZADD + ZREMRANGEBYRANK + EXPIRE in a single multi() pipeline', async () => {
    await catalogService.recordProductView(USER_A, pid(2));
    expect(mockRedisMulti).toHaveBeenCalledOnce();
  });

  it('should enforce the 20-item cap — oldest item evicted on 21st insert', async () => {
    // Add items 1..20 with ascending timestamps so item 1 has lowest score
    for (let i = 1; i <= 20; i++) {
      await catalogService.recordProductView(USER_A, pid(i));
    }

    const zset = getZSet(`catalog:recently_viewed:${USER_A}`);
    expect(zset.size()).toBe(20);

    // Insert the 21st item — oldest (pid(1)) should be evicted
    await catalogService.recordProductView(USER_A, pid(21));

    expect(zset.size()).toBe(20);
    const members = zset.zRange(0, -1, { REV: true });
    expect(members).toContain(pid(21));
    expect(members).not.toContain(pid(1));
  });

  it('should update score (re-view) using GT — no duplicate members', async () => {
    const id = pid(3);
    await catalogService.recordProductView(USER_A, id);
    await new Promise((r) => setTimeout(r, 5));
    const t2 = Date.now();
    await catalogService.recordProductView(USER_A, id);

    const zset = getZSet(`catalog:recently_viewed:${USER_A}`);
    expect(zset.store.get(id)).toBeGreaterThanOrEqual(t2);
    expect(zset.size()).toBe(1);
  });

  it('should not change ZSet size when re-viewing an existing item', async () => {
    await catalogService.recordProductView(USER_A, pid(10));
    await catalogService.recordProductView(USER_A, pid(11));
    await catalogService.recordProductView(USER_A, pid(10));
    expect(getZSet(`catalog:recently_viewed:${USER_A}`).size()).toBe(2);
  });
});

// ── getRecentlyViewedProducts ─────────────────────────────────────────────────

describe('CatalogService — getRecentlyViewedProducts', () => {
  beforeEach(() => {
    resetMocks();
    Object.keys(MOCK_PRODUCTS).forEach((k) => delete MOCK_PRODUCTS[k]);
  });

  it('should return empty list for a user with no history', async () => {
    const result = await catalogService.getRecentlyViewedProducts('newuser');
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return products newest-first (highest score = index 0)', async () => {
    const p1 = pid(101); const p2 = pid(102); const p3 = pid(103);
    [p1, p2, p3].forEach((id) => registerMockProduct(id));

    const zset = getZSet(`catalog:recently_viewed:${USER_A}`);
    zset.zAdd(p1, 1000);
    zset.zAdd(p2, 2000);
    zset.zAdd(p3, 3000); // highest score → should be items[0]

    const result = await catalogService.getRecentlyViewedProducts(USER_A);
    expect(result.items[0]).toMatchObject({ _id: p3 });
    expect(result.items[1]).toMatchObject({ _id: p2 });
    expect(result.items[2]).toMatchObject({ _id: p1 });
  });

  it('should silently filter out soft-deleted products', async () => {
    const pGood = pid(201); const pDel = pid(202);
    registerMockProduct(pGood, false);
    registerMockProduct(pDel, true);
    const zset = getZSet(`catalog:recently_viewed:${USER_A}`);
    zset.zAdd(pGood, 1000);
    zset.zAdd(pDel, 2000);

    const result = await catalogService.getRecentlyViewedProducts(USER_A);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ _id: pGood });
  });

  it('should respect the limit parameter', async () => {
    for (let i = 300; i < 320; i++) {
      const id = pid(i);
      registerMockProduct(id);
      getZSet(`catalog:recently_viewed:${USER_A}`).zAdd(id, i);
    }
    const result = await catalogService.getRecentlyViewedProducts(USER_A, 5);
    expect(result.items).toHaveLength(5);
  });
});

// ── clearRecentlyViewed ───────────────────────────────────────────────────────

describe('CatalogService — clearRecentlyViewed', () => {
  beforeEach(resetMocks);

  it('should call del with the correct Redis key', async () => {
    await catalogService.clearRecentlyViewed(USER_A);
    expect(mockDel).toHaveBeenCalledWith(`catalog:recently_viewed:${USER_A}`);
  });

  it('should remove the in-memory ZSet after clearing', async () => {
    getZSet(`catalog:recently_viewed:${USER_A}`).zAdd(pid(401), Date.now());
    await catalogService.clearRecentlyViewed(USER_A);
    expect(zsets.has(`catalog:recently_viewed:${USER_A}`)).toBe(false);
  });
});
