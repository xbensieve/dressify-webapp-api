import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as ordersService from '@modules/orders/orders.service';
import { OrderModel, OrderDetailModel } from '@modules/orders/orders.schema';
import { AddressModel } from '@modules/addresses/addresses.schema';
import { CartItemModel } from '@modules/cart/cart.schema';
import { ProductModel, ProductVariationModel } from '@modules/products/products.schema';

describe('OrdersService Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let productId: string;
  let variationId: string;
  let addressId: string;

  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderDetailModel.deleteMany({});
    await AddressModel.deleteMany({});
    await CartItemModel.deleteMany({});
    await ProductModel.deleteMany({});
    await ProductVariationModel.deleteMany({});

    // Seed default address
    const address = await AddressModel.create({
      user_id: userId,
      full_name: 'John Doe',
      phone: '0123456789',
      address_line: '123 Main St',
      city: 'Hanoi',
      district: 'Ba Dinh',
      ward: 'Cong Vi',
      is_default: true,
    });
    addressId = address._id.toString();

    // Seed product and variation
    const product = await ProductModel.create({
      name: 'Shirt',
      price: 30,
      category_id: new mongoose.Types.ObjectId(),
      seller_id: new mongoose.Types.ObjectId(),
    });
    productId = product._id.toString();

    const variation = await ProductVariationModel.create({
      product_id: product._id,
      size: 'L',
      color: 'Red',
      price: 30,
      stock_quantity: 5,
    });
    variationId = variation._id.toString();
  });

  describe('createOrder', () => {
    it('should throw BadRequestError if user has no default address', async () => {
      await AddressModel.deleteMany({});
      await expect(
        ordersService.createOrder(userId, [{ _id: variationId, product_id: productId, price: 30, quantity: 1 }]),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('address') });
    });

    it('should throw NotFoundError if variation does not exist', async () => {
      const fakeVarId = new mongoose.Types.ObjectId().toString();
      await expect(
        ordersService.createOrder(userId, [{ _id: fakeVarId, product_id: productId, price: 30, quantity: 1 }]),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw BadRequestError if insufficient stock', async () => {
      await expect(
        ordersService.createOrder(userId, [{ _id: variationId, product_id: productId, price: 30, quantity: 10 }]),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('Insufficient stock') });
    });

    it('should create order successfully and subtract stock/clear transaction properly', async () => {
      const result = await ordersService.createOrder(userId, [
        { _id: variationId, product_id: productId, price: 30, quantity: 2 },
      ]);

      expect(result).toHaveProperty('orderId');
      const order = await OrderModel.findById(result.orderId);
      expect(order).toBeTruthy();
      expect(order!.total_amount).toBe(60);

      const details = await OrderDetailModel.find({ order_id: result.orderId });
      expect(details).toHaveLength(1);
      expect(details[0].variation_id.toString()).toBe(variationId);
      expect(details[0].quantity).toBe(2);
    });
  });

  describe('createOrderFromCart', () => {
    it('should create order from cart items and clear the items from cart', async () => {
      // Create some cart items
      const cartItem = await CartItemModel.create({
        cart_id: new mongoose.Types.ObjectId(),
        product_id: productId,
        variation_id: variationId,
        quantity: 3,
      });

      const result = await ordersService.createOrderFromCart(userId, [cartItem._id.toString()]);
      expect(result).toHaveProperty('orderId');

      const order = await OrderModel.findById(result.orderId);
      expect(order!.total_amount).toBe(90);

      // Cart item should be deleted
      const cartInDb = await CartItemModel.findById(cartItem._id);
      expect(cartInDb).toBeNull();
    });

    it('should rollback transaction if some cart items do not exist', async () => {
      const fakeCartItemId = new mongoose.Types.ObjectId().toString();
      await expect(
        ordersService.createOrderFromCart(userId, [fakeCartItemId]),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('not found') });
    });
  });

  describe('getOrdersByUser', () => {
    it('should return paginated list of user orders with details', async () => {
      const order = await OrderModel.create({
        user_id: userId,
        address_id: addressId,
        total_amount: 30,
      });

      await OrderDetailModel.create({
        order_id: order._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
        price_at_purchase: 30,
      });

      const result = await ordersService.getOrdersByUser(userId, { page: '1', limit: '10' });
      expect(result.totalOrders).toBe(1);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]._id.toString()).toBe(order._id.toString());
      expect((result.orders[0] as { details: unknown[] }).details).toHaveLength(1);
    });
  });
});
