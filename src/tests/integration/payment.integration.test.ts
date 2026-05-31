import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { OrderModel } from '@modules/orders/orders.schema';
import type { Express } from 'express';

// Mock Redis & queue
vi.mock('@infrastructure/cache/redis.client.js', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@infrastructure/queue/bullmq.js', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  getQueue: vi.fn(),
}));

describe('Payment Integration Tests', () => {
  let app: Express;
  let customerToken: string;
  let customerId: string;
  let orderId: string;

  const makeToken = (userId: string, role = 'customer') =>
    jwt.sign({ id: userId, role, username: 'paytester' }, 'test_secret_min_16_chars_long', { expiresIn: '15m' });

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await OrderModel.deleteMany({});
    customerId = new mongoose.Types.ObjectId().toString();
    customerToken = makeToken(customerId);

    const order = await OrderModel.create({
      user_id: customerId,
      address_id: new mongoose.Types.ObjectId(),
      total_amount: 100,
      order_status: 'pending',
    });
    orderId = order._id.toString();
  });

  describe('POST /api/vnpay/create-payment-url', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/vnpay/create-payment-url')
        .send({ orderId });
      expect(res.status).toBe(401);
    });

    it('should generate payment url successfully', async () => {
      const res = await request(app)
        .post('/api/vnpay/create-payment-url')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentUrl).toContain('https://sandbox.vnpayment.vn');
    });
  });

  describe('GET /api/vnpay/handle-payment-response', () => {
    it('should redirect to fail url on failed response', async () => {
      const res = await request(app)
        .get('/api/vnpay/handle-payment-response')
        .query({
          vnp_ResponseCode: '24',
          vnp_TxnRef: orderId,
          vnp_TransactionNo: '12345',
          vnp_Amount: '260000000',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://dressify-vesti.vercel.app/failed');
    });
  });
});
