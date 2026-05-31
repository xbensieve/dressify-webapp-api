import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import type { Express } from 'express';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('E2E API Tests', () => {
  describe('Health', () => {
    it('GET /health should return 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Categories', () => {
    it('GET /api/categories should return empty array initially', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Products', () => {
    it('GET /api/products/search should require keyword', async () => {
      const res = await request(app).get('/api/products/search');
      expect(res.status).toBe(400);
    });

    it('GET /api/products/search?keyword=shirt should work', async () => {
      const res = await request(app).get('/api/products/search?keyword=shirt');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/carts should return 401 without token', async () => {
      const res = await request(app).get('/api/carts');
      expect(res.status).toBe(401);
    });

    it('GET /api/orders/my-orders should return 401 without token', async () => {
      const res = await request(app).get('/api/orders/my-orders');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/statistics should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/statistics');
      expect(res.status).toBe(401);
    });
  });
});
