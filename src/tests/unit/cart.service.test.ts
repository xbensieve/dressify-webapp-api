import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as cartService from '@modules/cart/cart.service';
import { CartModel, CartItemModel } from '@modules/cart/cart.schema';
import { ProductModel, ProductVariationModel, ProductImageModel } from '@modules/products/products.schema';

describe('CartService Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let productId: string;
  let variationId: string;

  beforeEach(async () => {
    await CartModel.deleteMany({});
    await CartItemModel.deleteMany({});
    await ProductModel.deleteMany({});
    await ProductVariationModel.deleteMany({});
    await ProductImageModel.deleteMany({});

    // Seed dummy product and variation
    const product = await ProductModel.create({
      name: 'Cool Shirt',
      description: 'A very cool shirt',
      price: 25,
      category_id: new mongoose.Types.ObjectId(),
      seller_id: new mongoose.Types.ObjectId(),
    });
    productId = product._id.toString();

    const variation = await ProductVariationModel.create({
      product_id: product._id,
      size: 'M',
      color: 'Blue',
      price: 25,
      stock_quantity: 10,
    });
    variationId = variation._id.toString();

    await ProductImageModel.create({
      productId: product._id,
      imageUrl: 'http://example.com/shirt.jpg',
      isPrimary: true,
      displayOrder: 1,
    });
  });

  describe('getCart', () => {
    it('should throw NotFoundError if cart does not exist for the user', async () => {
      await expect(cartService.getCart(userId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should return populated cart if it exists', async () => {
      const cart = await CartModel.create({ user_id: userId, total_price: 25 });
      await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
      });

      const result = await cartService.getCart(userId);
      expect(result).toBeTruthy();
      expect(result.total_price).toBe(25);
      expect(result.total_items).toBe(1);
      expect(result.items[0].product.name).toBe('Cool Shirt');
      expect(result.items[0].product.images).toContain('http://example.com/shirt.jpg');
      expect(result.items[0].variation.size).toBe('M');
    });
  });

  describe('addToCart', () => {
    it('should throw BadRequestError for invalid item data', async () => {
      await expect(
        cartService.addToCart(userId, '', variationId, 1),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      await expect(
        cartService.addToCart(userId, productId, variationId, -1),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should throw NotFoundError if product does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        cartService.addToCart(userId, fakeId, variationId, 1),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw NotFoundError if variation does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        cartService.addToCart(userId, productId, fakeId, 1),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should create cart and add item if user has no cart', async () => {
      const result = await cartService.addToCart(userId, productId, variationId, 2);
      expect(result.total_price).toBe(50);
      expect(result.total_items).toBe(1);
      expect(result.items[0].quantity).toBe(2);

      const cartInDb = await CartModel.findOne({ user_id: userId });
      expect(cartInDb).toBeTruthy();
      expect(cartInDb!.total_price).toBe(50);
    });

    it('should increment quantity and update price if item already exists in cart', async () => {
      await cartService.addToCart(userId, productId, variationId, 1);
      const result = await cartService.addToCart(userId, productId, variationId, 2);

      expect(result.total_price).toBe(75);
      expect(result.items[0].quantity).toBe(3);
    });
  });

  describe('updateCartItem', () => {
    it('should throw NotFoundError if cart item does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        cartService.updateCartItem(userId, fakeId, 5),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should update quantity and adjust total_price', async () => {
      const cart = await CartModel.create({ user_id: userId, total_price: 25 });
      const item = await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 1,
      });

      const result = await cartService.updateCartItem(userId, item._id.toString(), 3);
      expect(result.total_price).toBe(75);
      expect(result.items[0].quantity).toBe(3);
    });
  });

  describe('deleteCartItem', () => {
    it('should throw NotFoundError if cart item does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        cartService.deleteCartItem(userId, fakeId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should delete item from cart and adjust total_price', async () => {
      const cart = await CartModel.create({ user_id: userId, total_price: 75 });
      const item = await CartItemModel.create({
        cart_id: cart._id,
        product_id: productId,
        variation_id: variationId,
        quantity: 3,
      });

      const result = await cartService.deleteCartItem(userId, item._id.toString());
      expect(result.total_price).toBe(0);
      expect(result.total_items).toBe(0);

      const itemInDb = await CartItemModel.findById(item._id);
      expect(itemInDb).toBeNull();
    });
  });
});
