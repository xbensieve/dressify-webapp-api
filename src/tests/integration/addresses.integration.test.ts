import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { AddressModel } from '@modules/addresses/addresses.schema';
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

describe('Addresses Integration Tests', () => {
  let app: Express;
  let customerToken: string;
  let customerId: string;
  const addressData = {
    full_name: 'John Doe',
    phone: '0123456789',
    address_line: '123 Main St',
    city: 'Hanoi',
    district: 'Ba Dinh',
    ward: 'Cong Vi',
  };

  const makeToken = (userId: string, role = 'customer') =>
    jwt.sign({ id: userId, role, username: 'addrtester' }, 'test_secret_min_16_chars_long', { expiresIn: '15m' });

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await AddressModel.deleteMany({});
    customerId = new mongoose.Types.ObjectId().toString();
    customerToken = makeToken(customerId);
  });

  describe('GET /api/addresses', () => {
    it('should return empty list initially', async () => {
      const res = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return user addresses', async () => {
      await AddressModel.create({ ...addressData, user_id: customerId });

      const res = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/addresses', () => {
    it('should create an address', async () => {
      const res = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(addressData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe(addressData.full_name);
    });
  });

  describe('PUT /api/addresses/:id', () => {
    it('should update an address', async () => {
      const addr = await AddressModel.create({ ...addressData, user_id: customerId });

      const res = await request(app)
        .put(`/api/addresses/${addr._id.toString()}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ full_name: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe('Jane Doe');
    });
  });

  describe('DELETE /api/addresses/:id', () => {
    it('should delete an address', async () => {
      const addr = await AddressModel.create({ ...addressData, user_id: customerId });

      const res = await request(app)
        .delete(`/api/addresses/${addr._id.toString()}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const found = await AddressModel.findById(addr._id);
      expect(found).toBeNull();
    });
  });

  describe('PATCH /api/addresses/:id/default', () => {
    it('should set an address as default', async () => {
      const addr = await AddressModel.create({ ...addressData, user_id: customerId, is_default: false });

      const res = await request(app)
        .patch(`/api/addresses/${addr._id.toString()}/default`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await AddressModel.findById(addr._id);
      expect(updated!.is_default).toBe(true);
    });
  });
});
