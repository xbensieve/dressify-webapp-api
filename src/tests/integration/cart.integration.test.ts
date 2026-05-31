import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { CartModel, CartItemModel } from '@modules/cart/cart.schema';
import { ProductModel, ProductVariationModel } from '@modules/products/products.schema';
import type { Express } from 'express';

// Mock Redis & queue so they are hermetic
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

describe('Cart Integration Tests', () => {
  let app: Express;
  let customerToken: string;
  let customerId: string;
  let productId: string;
  let variationId: string;

  const makeToken = (userId: string, role = 'customer') =>
    jwt.sign({ id: userId, role, username: 'carttester' }, 'test_secret_min_16_chars_long', { expiresIn: '15m' });

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await CartModel.deleteMany({});
    await CartItemModel.deleteMany({});
    await ProductModel.deleteMany({});
    await ProductVariationModel.deleteMany({});

    customerId = new mongoose.Types.ObjectId().toString();
    customerToken = makeToken(customerId);

    const product = await ProductModel.create({
      name: 'Integration Shirt',
      price: 40,
      category_id: new mongoose.Types.ObjectId(),
      seller_id: new mongoose.Types.ObjectId(),
    });
    productId = product._id.toString();

    const variation = await ProductVariationModel.create({
      product_id: product._id,
      size: 'XL',
      color: 'Green',
      price: 40,
      stock_quantity: 8,
    });
    variationId = variation._id.toString();
  });

  describe('GET /api/carts', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/carts');
      expect(res.status).toBe(401);
    });

    it('should return 404 when cart has not been created yet', async () => {
      const res = await request(app)
        .get('/api/carts')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 200 with cart contents when cart exists', async () => {
      const cart = await CartModel.create({ user_id: customerId, total_price: 40 });
      await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
      });

      const res = await request(app)
        .get('/api/carts')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items).toHaveLength(1);
    });
  });

  describe('POST /api/carts/add', () => {
    it('should add an item to the cart', async () => {
      const res = await request(app)
        .post('/api/carts/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, variationId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.total_price).toBe(80);
      expect(res.body.data.cart.items[0].quantity).toBe(2);
    });
  });

  describe('PUT /api/carts/:cartItemId', () => {
    it('should update cart item quantity', async () => {
      const cart = await CartModel.create({ user_id: customerId, total_price: 40 });
      const item = await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
      });

      const res = await request(app)
        .put(`/api/carts/${item._id.toString()}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 4 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.total_price).toBe(160);
    });
  });

  describe('DELETE /api/carts/:cartItemId', () => {
    it('should delete cart item', async () => {
      const cart = await CartModel.create({ user_id: customerId, total_price: 40 });
      const item = await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
      });

      const res = await request(app)
        .delete(`/api/carts/${item._id.toString()}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items).toHaveLength(0);
    });
  });
});
