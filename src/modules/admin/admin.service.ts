import { UserRepository } from '@modules/users/users.repository';
import { OrderModel } from '@modules/orders/orders.schema';
import { ProductModel } from '@modules/products/products.schema';
import { NotFoundError, BadRequestError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('admin.service');
const userRepository = new UserRepository();

export const getAllUsers = async () => {
  log.info('Admin: fetching all users');
  return userRepository.findAll();
};

export const updateUserStatus = async (id: string, status: string) => {
  if (!['active', 'inactive'].includes(status)) throw new BadRequestError('Invalid status');
  log.info({ userId: id, status }, 'Admin: updating user status');
  const user = await userRepository.updateStatus(id, status as 'active' | 'inactive');
  if (!user) { log.warn({ userId: id }, 'User not found for status update'); throw new NotFoundError('User'); }
  log.info({ userId: id, status }, 'User status updated');
  return user;
};

export const getAllOrders = async (): Promise<Record<string, unknown>[]> => {
  log.info('Admin: fetching all orders');
  const orders = await OrderModel.find().populate('user_id', 'username email').populate('address_id').lean();
  return orders as unknown as Record<string, unknown>[];
};

export const updateOrderStatus = async (id: string, order_status: string) => {
  const VALID = ['pending', 'completed', 'cancelled'];
  if (!VALID.includes(order_status)) throw new BadRequestError('Invalid order status');
  log.info({ orderId: id, order_status }, 'Admin: updating order status');
  const order = await OrderModel.findByIdAndUpdate(id, { order_status }, { new: true });
  if (!order) { log.warn({ orderId: id }, 'Order not found for status update'); throw new NotFoundError('Order'); }
  log.info({ orderId: id, order_status }, 'Order status updated');
  return order;
};

export const getStatistics = async () => {
  log.info('Admin: fetching platform statistics');
  const [totalUsers, totalOrders, revenueAgg, totalProducts] = await Promise.all([
    UserModel.countDocuments(),
    OrderModel.countDocuments(),
    OrderModel.aggregate([{ $match: { order_status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]),
    ProductModel.countDocuments({ isDeleted: false }),
  ]);
  const stats = { totalUsers, totalOrders, totalRevenue: (revenueAgg[0] as { total?: number } | undefined)?.total ?? 0, totalProducts };
  log.info(stats, 'Statistics fetched');
  return stats;
};

import { UserModel } from '@modules/users/users.schema';
