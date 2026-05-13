import mongoose from 'mongoose';
import { OrderModel, OrderDetailModel } from './orders.schema';
import { CartItemModel } from '@modules/cart/cart.schema';
import { ProductVariationModel } from '@modules/products/products.schema';
import { ProductImageModel } from '@modules/products/products.schema';
import { AddressRepository } from '@modules/addresses/addresses.repository';
import { BadRequestError, NotFoundError } from '@shared/errors/AppError';
import { parsePagination, getSkip } from '@shared/utils/pagination';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('orders.service');
const addressRepository = new AddressRepository();

export const createOrder = async (
  userId: string,
  products: Array<{ _id: string; product_id: string; price: number; quantity: number }>,
) => {
  log.info({ userId, itemCount: products.length }, 'Creating order');

  const defaultAddress = await addressRepository.findDefault(userId);
  if (!defaultAddress) throw new BadRequestError('Please add a default delivery address first');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    for (const item of products) {
      const variation = await ProductVariationModel.findById(item._id).session(session);
      if (!variation) throw new NotFoundError(`Product variation ${item._id}`);
      if (variation.stock_quantity < item.quantity)
        throw new BadRequestError(`Insufficient stock for variation ${item._id}`);
      totalAmount += item.price * item.quantity;
    }

    const [order] = await OrderModel.create(
      [{ user_id: userId, address_id: defaultAddress._id, total_amount: totalAmount }],
      { session },
    );

    for (const item of products) {
      await OrderDetailModel.create(
        [{ order_id: order._id, product_id: item.product_id, variation_id: item._id, quantity: item.quantity, price_at_purchase: item.price }],
        { session },
      );
    }

    await session.commitTransaction();
    log.info({ userId, orderId: String(order._id), totalAmount }, 'Order created successfully');
    return { orderId: order._id };
  } catch (err) {
    await session.abortTransaction();
    log.error({ err, userId }, 'Order creation failed — transaction rolled back');
    throw err;
  } finally {
    await session.endSession();
  }
};

export const createOrderFromCart = async (userId: string, cartItemIds: string[]) => {
  log.info({ userId, cartItemCount: cartItemIds.length }, 'Creating order from cart');

  const defaultAddress = await addressRepository.findDefault(userId);
  if (!defaultAddress) throw new BadRequestError('Please add a default delivery address first');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cartItems = await CartItemModel.find({ _id: { $in: cartItemIds } }).session(session);
    if (cartItems.length !== cartItemIds.length) throw new BadRequestError('Some cart items not found');

    let totalAmount = 0;
    const orderDetails = [];

    for (const item of cartItems) {
      const variation = await ProductVariationModel.findById(item.variation_id).session(session);
      if (!variation) throw new NotFoundError('Product variation');
      if (variation.stock_quantity < item.quantity)
        throw new BadRequestError(`Insufficient stock for variation ${variation._id.toString()}`);
      totalAmount += variation.price * item.quantity;
      orderDetails.push({ product_id: item.product_id, variation_id: item.variation_id, quantity: item.quantity, price_at_purchase: variation.price });
    }

    const [savedOrder] = await OrderModel.create(
      [{ user_id: userId, address_id: defaultAddress._id, total_amount: totalAmount }],
      { session },
    );

    for (const detail of orderDetails) {
      await OrderDetailModel.create([{ order_id: savedOrder._id, ...detail }], { session });
    }

    await CartItemModel.deleteMany({ _id: { $in: cartItemIds } }).session(session);
    await session.commitTransaction();

    log.info({ userId, orderId: String(savedOrder._id), totalAmount }, 'Order from cart created — cart items cleared');
    return { orderId: savedOrder._id };
  } catch (err) {
    await session.abortTransaction();
    log.error({ err, userId }, 'Order from cart failed — transaction rolled back');
    throw err;
  } finally {
    await session.endSession();
  }
};

export const getOrdersByUser = async (userId: string, query: Record<string, unknown>): Promise<{
  page: number; limit: number; totalOrders: number; totalPages: number; orders: Record<string, unknown>[];
}> => {
  const { page, limit } = parsePagination(query);
  const skip = getSkip({ page, limit });

  log.debug({ userId, page, limit }, 'Fetching user orders');

  const [totalOrders, orders] = await Promise.all([
    OrderModel.countDocuments({ user_id: userId }),
    OrderModel.find({ user_id: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      const details = await OrderDetailModel.find({ order_id: order._id })
        .populate({ path: 'product_id', select: 'name description price category_id seller_id' })
        .populate({ path: 'variation_id', select: 'size color price stock_quantity' })
        .lean();

      const detailsWithImages = await Promise.all(
        details.map(async (detail) => {
          const productId = (detail.product_id as unknown as { _id: string } | null)?._id ?? detail.product_id;
          const images = await ProductImageModel.find({ productId })
            .sort({ isPrimary: -1, displayOrder: 1 })
            .select('imageUrl isPrimary displayOrder altText -_id')
            .lean();
          return { ...detail, images };
        }),
      );

      return { ...order, details: detailsWithImages };
    }),
  );

  log.debug({ userId, totalOrders, page }, 'Orders fetched');
  return { page, limit, totalOrders, totalPages: Math.ceil(totalOrders / limit), orders: ordersWithDetails };
};
