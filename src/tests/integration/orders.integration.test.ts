import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { OrderModel, OrderDetailModel } from '@modules/orders/orders.schema';
import { AddressModel } from '@modules/addresses/addresses.schema';
import { CartItemModel } from '@modules/cart/cart.schema';
import { ProductModel, ProductVariationModel } from '@modules/products/products.schema';
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

describe('Orders Integration Tests', () => {
  let app: Express;
  let customerToken: string;
  let customerId: string;
  let productId: string;
  let variationId: string;

  const makeToken = (userId: string, role = 'customer') =>
    jwt.sign({ id: userId, role, username: 'ordertester' }, 'test_secret_min_16_chars_long', { expiresIn: '15m' });

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderDetailModel.deleteMany({});
    await AddressModel.deleteMany({});
    await CartItemModel.deleteMany({});
    await ProductModel.deleteMany({});
    await ProductVariationModel.deleteMany({});

    customerId = new mongoose.Types.ObjectId().toString();
    customerToken = makeToken(customerId);

    // Seed default address for order creation
    await AddressModel.create({
      user_id: customerId,
      full_name: 'John Doe',
      phone: '0123456789',
      address_line: '123 Main St',
      city: 'Hanoi',
      district: 'Ba Dinh',
      ward: 'Cong Vi',
      is_default: true,
    });

    const product = await ProductModel.create({
      name: 'Order Integration Shirt',
      price: 50,
      category_id: new mongoose.Types.ObjectId(),
      seller_id: new mongoose.Types.ObjectId(),
    });
    productId = product._id.toString();

    const variation = await ProductVariationModel.create({
      product_id: product._id,
      size: 'M',
      color: 'Blue',
      price: 50,
      stock_quantity: 10,
    });
    variationId = variation._id.toString();
  });

  describe('POST /api/orders', () => {
    it('should create order successfully', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          products: [{ _id: variationId, product_id: productId, price: 50, quantity: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderId).toBeTruthy();

      const details = await OrderDetailModel.find({ order_id: res.body.orderId });
      expect(details).toHaveLength(1);
    });
  });

  describe('POST /api/orders/from-cart', () => {
    it('should create order from cart and delete cart items', async () => {
      const cartItem = await CartItemModel.create({
        cart_id: new mongoose.Types.ObjectId(),
        product_id: productId,
        variation_id: variationId,
        quantity: 2,
      });

      const res = await request(app)
        .post('/api/orders/from-cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ cartItemIds: [cartItem._id.toString()] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderId).toBeTruthy();

      const details = await OrderDetailModel.find({ order_id: res.body.orderId });
      expect(details).toHaveLength(1);

      const clearedItem = await CartItemModel.findById(cartItem._id);
      expect(clearedItem).toBeNull();
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should retrieve user orders', async () => {
      const order = await OrderModel.create({
        user_id: customerId,
        address_id: new mongoose.Types.ObjectId(),
        total_amount: 100,
      });

      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0]._id).toBe(order._id.toString());
    });
  });
});
