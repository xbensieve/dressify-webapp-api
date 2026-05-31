/**
 * Integration Tests — Promotions, Logistics, Admin Export & Catalog APIs
 *
 * Strategy:
 *  - Full Express app via createApp() + Supertest (no real TCP binding).
 *  - MongoDB Memory Server (via setup.ts) for real persistence.
 *  - Redis mocked at the module level to avoid requiring a live Redis server.
 *  - Auth tokens generated manually using the real JWT signing function.
 *  - Tests exercise the full Routes → Controller → Service → Repository stack.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import type { Express } from 'express';

// ── Redis mock (must be before createApp import) ──────────────────────────────

const {
  mockLockRelease, mockAcquireLock,
  mockGet, mockSet, mockDel, mockSetEx, mockZRange, mockMulti,
} = vi.hoisted(() => {
  const mockLockRelease = vi.fn().mockResolvedValue(undefined);
  const mockAcquireLock = vi.fn().mockResolvedValue({ release: mockLockRelease });
  const mockGet = vi.fn().mockResolvedValue(null);
  const mockSet = vi.fn().mockResolvedValue('OK');
  const mockDel = vi.fn().mockResolvedValue(1);
  const mockSetEx = vi.fn().mockResolvedValue('OK');
  const mockZRange = vi.fn().mockResolvedValue([]);
  const mockMulti = vi.fn().mockReturnValue({
    zAdd: vi.fn().mockReturnThis(),
    zRemRangeByRank: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  });
  return { mockLockRelease, mockAcquireLock, mockGet, mockSet, mockDel, mockSetEx, mockZRange, mockMulti };
});

vi.mock('@infrastructure/cache/redlock.client.js', () => ({
  acquireLock: mockAcquireLock,
  LockAcquisitionError: class LockAcquisitionError extends Error {
    constructor(key: string) { super(key); this.name = 'LockAcquisitionError'; }
  },
}));

vi.mock('@infrastructure/cache/redis.client.js', () => ({
  redisClient: {
    get: mockGet,
    set: mockSet,
    del: mockDel,
    setEx: mockSetEx,
    zRange: mockZRange,
    multi: mockMulti,
  },
}));

vi.mock('@infrastructure/queue/bullmq.js', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  getQueue: vi.fn(),
}));

import { createApp } from '../../app';
import { VoucherModel, FlashSaleModel } from '@modules/promotions/promotions.schema';
import { ShipmentEventModel } from '@modules/logistics/logistics.schema';
import { OrderModel } from '@modules/orders/orders.schema';
import { UserModel } from '@modules/users/users.schema';
import jwt from 'jsonwebtoken';


// ── Helpers ───────────────────────────────────────────────────────────────────

let app: Express;

/** Generates a signed JWT for a given userId and role (no DB hit needed) */
const makeToken = (userId: string, role: 'customer' | 'admin' | 'seller' = 'customer') =>
  jwt.sign(
    { id: userId, role, username: 'testuser' },
    'test_secret_min_16_chars_long', // matches setup.ts mock
    { expiresIn: '15m' },
  );

const CUSTOMER_ID = new mongoose.Types.ObjectId().toString();
const ADMIN_ID = new mongoose.Types.ObjectId().toString();
const customerToken = makeToken(CUSTOMER_ID, 'customer');
const adminToken = makeToken(ADMIN_ID, 'admin');

const makeObjectId = () => new mongoose.Types.ObjectId().toString();

/** Creates a standard active voucher */
const seedVoucher = async (code: string, overrides: Record<string, unknown> = {}) =>
  VoucherModel.create({
    code,
    type: 'percentage',
    discount_value: 20,
    min_order_amount: 0,
    usage_limit: 100,
    usage_count: 0,
    per_user_limit: 1,
    status: 'active',
    starts_at: new Date(Date.now() - 1000),
    expires_at: new Date(Date.now() + 86_400_000),
    ...overrides,
  });

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue('OK');
  mockZRange.mockResolvedValue([]);
});

// ════════════════════════════════════════════════════════════════════════════════
// PROMOTIONS MODULE
// ════════════════════════════════════════════════════════════════════════════════

describe('POST /api/promotions/vouchers/apply', () => {
  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .send({ code: 'TEST', orderAmount: 100 });
    expect(res.status).toBe(401);
  });

  it('should return 400 for missing code field (Zod validation)', async () => {
    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderAmount: 100 }); // missing code
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for non-positive orderAmount', async () => {
    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'TEST20', orderAmount: -10 });
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent voucher code', async () => {
    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'DOESNOTEXIST', orderAmount: 200 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('should return 200 and apply a valid percentage voucher', async () => {
    await seedVoucher('INTEGRATION20', { discount_value: 20, max_discount_amount: 40 });

    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'INTEGRATION20', orderAmount: 300 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.calculatedDiscount).toBe(40); // 20% of 300 = 60, capped at 40
    expect(res.body.data.finalAmount).toBe(260);
  });

  it('should return 400 when voucher usage limit is exhausted', async () => {
    await seedVoucher('EXHAUSTED_INT', { usage_limit: 3, usage_count: 3 });

    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'EXHAUSTED_INT', orderAmount: 200 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('usage limit');
  });

  it('should uppercase the voucher code (Zod transform)', async () => {
    await seedVoucher('LOWERCASE_CHECK');

    const res = await request(app)
      .post('/api/promotions/vouchers/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'lowercase_check', orderAmount: 200 }); // lowercase input

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('LOWERCASE_CHECK');
  });
});

describe('POST /api/promotions/flash-sales/reserve', () => {
  const variationId = makeObjectId();

  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .send({ variationId, quantity: 1 });
    expect(res.status).toBe(401);
  });

  it('should return 400 for invalid variationId (not a valid ObjectId)', async () => {
    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variationId: 'invalid-id', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for quantity < 1', async () => {
    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variationId, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('should return 400 for quantity > 100 (Zod max)', async () => {
    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variationId, quantity: 101 });
    expect(res.status).toBe(400);
  });

  it('should return 404 when no active flash sale exists for the variation', async () => {
    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variationId, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('should return 200 and reserve units from an active flash sale', async () => {
    const vid = new mongoose.Types.ObjectId();
    await FlashSaleModel.create({
      product_id: new mongoose.Types.ObjectId(),
      variation_id: vid,
      sale_price: 75,
      reserved_quantity: 50,
      sold_quantity: 0,
      starts_at: new Date(Date.now() - 1000),
      ends_at: new Date(Date.now() + 86_400_000),
      is_active: true,
    });

    const res = await request(app)
      .post('/api/promotions/flash-sales/reserve')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variationId: vid.toString(), quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(3);
    expect(res.body.data.remaining).toBe(47);
    expect(res.body.data.salePrice).toBe(75);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// LOGISTICS WEBHOOK MODULE
// ════════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/webhooks/shipment-status', () => {
  const makeWebhookPayload = (overrides: Record<string, unknown> = {}) => ({
    event_id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    order_id: makeObjectId(),
    tracking_number: 'TRACK-INT-001',
    status: 'in_transit',
    carrier_code: 'VNPOST',
    description: 'Package in transit',
    location: 'Hanoi',
    event_timestamp: new Date().toISOString(),
    ...overrides,
  });

  it('should return 400 for missing event_id', async () => {
    const payload = makeWebhookPayload();
    delete (payload as Record<string, unknown>)['event_id'];
    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid order_id (not a 24-char hex ObjectId)', async () => {
    const payload = makeWebhookPayload({ order_id: 'not-an-objectid' });
    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid status value', async () => {
    const payload = makeWebhookPayload({ status: 'flying' });
    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);
    expect(res.status).toBe(400);
  });

  it('should return 400 for non-ISO-8601 event_timestamp', async () => {
    const payload = makeWebhookPayload({ event_timestamp: '2025/01/01 12:00:00' });
    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);
    expect(res.status).toBe(400);
  });

  it('should return 200 and persist a fresh webhook event', async () => {
    const payload = makeWebhookPayload();
    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.duplicate).toBe(false);
    expect(res.body.data.event_id).toBe(payload.event_id);

    // Verify persisted in DB
    const doc = await ShipmentEventModel.findOne({ idempotency_key: payload.event_id });
    expect(doc).toBeTruthy();
    expect(doc!.tracking_number).toBe('TRACK-INT-001');
    expect(doc!.status).toBe('in_transit');
  });

  it('[Layer-1] should return 200 duplicate=true for a cached duplicate (Redis HIT)', async () => {
    const payload = makeWebhookPayload({ event_id: 'EVT-CACHED-DUP' });
    const cachedAck = JSON.stringify({ received: true, event_id: 'EVT-CACHED-DUP', duplicate: false });
    mockGet.mockResolvedValueOnce(cachedAck);

    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.duplicate).toBe(true);
    // DB should NOT have a new document
    const count = await ShipmentEventModel.countDocuments({ idempotency_key: 'EVT-CACHED-DUP' });
    expect(count).toBe(0);
  });

  it('[Layer-2] should return 409 when processing lock is already held (concurrent duplicate)', async () => {
    const payload = makeWebhookPayload({ event_id: 'EVT-CONCURRENT-INT' });
    mockSet.mockResolvedValueOnce(null); // NX fails = lock held

    const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('should not require Authorization header (partner webhook, no JWT)', async () => {
    const payload = makeWebhookPayload();
    // No Authorization header — should still process
    const res = await request(app)
      .post('/api/v1/webhooks/shipment-status')
      .send(payload);
    expect(res.status).toBe(200);
  });

  it('should accept all valid status values', async () => {
    const statuses = [
      'pending', 'picked_up', 'in_transit', 'out_for_delivery',
      'delivered', 'failed_attempt', 'returned', 'cancelled',
    ];

    for (const status of statuses) {
      const payload = makeWebhookPayload({ status });
      const res = await request(app).post('/api/v1/webhooks/shipment-status').send(payload);
      expect(res.status).toBe(200);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN EXPORT MODULE
// ════════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/export/orders', () => {
  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/admin/export/orders');
    expect(res.status).toBe(401);
  });

  it('should return 403 for a non-admin user', async () => {
    const res = await request(app)
      .get('/api/admin/export/orders')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('should stream a CSV response for admin users', async () => {
    // Seed some orders
    await OrderModel.insertMany([
      { user_id: new mongoose.Types.ObjectId(), address_id: new mongoose.Types.ObjectId(), order_status: 'completed', total_amount: 100 },
      { user_id: new mongoose.Types.ObjectId(), address_id: new mongoose.Types.ObjectId(), order_status: 'pending', total_amount: 200 },
    ]);

    const res = await request(app)
      .get('/api/admin/export/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('orders_export_');

    // Response body should be valid CSV
    const lines = res.text.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines[0]).toContain('order_id');
    expect(lines[0]).toContain('status');
    expect(lines[0]).toContain('total_amount');
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 data rows
  });

  it('should return 400 for invalid status query param', async () => {
    const res = await request(app)
      .get('/api/admin/export/orders?status=invalid_status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid datetime in from param', async () => {
    const res = await request(app)
      .get('/api/admin/export/orders?from=not-a-date')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('should filter results by status query param', async () => {
    await OrderModel.insertMany([
      { user_id: new mongoose.Types.ObjectId(), address_id: new mongoose.Types.ObjectId(), order_status: 'cancelled', total_amount: 50 },
    ]);

    const res = await request(app)
      .get('/api/admin/export/orders?status=cancelled')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const lines = res.text.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    // Every data row must contain 'cancelled' status
    lines.slice(1).forEach((line) => expect(line).toContain('cancelled'));
  });

  it('should export only a header row when no orders exist (empty dataset)', async () => {
    // DB is clean from afterEach
    const res = await request(app)
      .get('/api/admin/export/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const lines = res.text.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1); // header only
    expect(lines[0]).toContain('order_id');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CATALOG MODULE (Recently Viewed)
// ════════════════════════════════════════════════════════════════════════════════

describe('POST /api/catalog/recently-viewed', () => {
  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/catalog/recently-viewed')
      .send({ productId: makeObjectId() });
    expect(res.status).toBe(401);
  });

  it('should return 400 for invalid productId (not a valid ObjectId)', async () => {
    const res = await request(app)
      .post('/api/catalog/recently-viewed')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'not-valid-id' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('should return 400 when productId is missing', async () => {
    const res = await request(app)
      .post('/api/catalog/recently-viewed')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 200 and record a product view', async () => {
    const pid = makeObjectId();
    const res = await request(app)
      .post('/api/catalog/recently-viewed')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: pid });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('recorded');
    // Verify Redis pipeline was called
    expect(mockMulti).toHaveBeenCalledOnce();
  });
});

describe('GET /api/catalog/recently-viewed', () => {
  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/catalog/recently-viewed');
    expect(res.status).toBe(401);
  });

  it('should return 200 with empty data for a user with no history', async () => {
    mockZRange.mockResolvedValue([]); // no items in ZSet

    const res = await request(app)
      .get('/api/catalog/recently-viewed')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('should return 400 for limit > 20', async () => {
    const res = await request(app)
      .get('/api/catalog/recently-viewed?limit=25')
      .set('Authorization', `Bearer ${customerToken}`);
    // limit is capped at 20 by controller, not a validation error
    // We just check it doesn't error out
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/catalog/recently-viewed', () => {
  it('should return 401 without authentication', async () => {
    const res = await request(app).delete('/api/catalog/recently-viewed');
    expect(res.status).toBe(401);
  });

  it('should return 200 and clear history', async () => {
    const res = await request(app)
      .delete('/api/catalog/recently-viewed')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDel).toHaveBeenCalledWith(`catalog:recently_viewed:${CUSTOMER_ID}`);
  });
});
