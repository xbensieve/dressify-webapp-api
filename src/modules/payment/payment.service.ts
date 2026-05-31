import crypto from 'crypto';
import moment from 'moment-timezone';
import { OrderModel, OrderDetailModel } from '@modules/orders/orders.schema';
import { TransactionModel } from '@modules/transactions/transactions.schema';
import { ProductVariationModel } from '@modules/products/products.schema';
import { env } from '@shared/config/env';
import { NotFoundError, BadRequestError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('payment.service');

const sortParams = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

export const generatePaymentUrl = async (orderId: string): Promise<string> => {
  log.info({ orderId }, 'Generating VNPay payment URL');
  if (!orderId) throw new BadRequestError('Order ID is required');
  const order = await OrderModel.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  const date = moment().tz(env.TIMEZONE);
  const vnp_Params: Record<string, unknown> = {
    vnp_Version: env.VNP_VERSION, vnp_Command: env.VNP_COMMAND, vnp_TmnCode: env.VNP_TMN_CODE,
    vnp_Locale: env.VNP_LOCALE, vnp_CurrCode: env.VNP_CURRCODE, vnp_TxnRef: orderId,
    vnp_OrderInfo: `Payment for ${orderId}`, vnp_OrderType: 'other',
    vnp_Amount: order.total_amount * 100 * 26000, vnp_ReturnUrl: env.VNP_RETURN_URL,
    vnp_IpAddr: '1.55.200.158', vnp_CreateDate: date.format('YYYYMMDDHHmmss'),
    vnp_ExpireDate: date.clone().add(15, 'minutes').format('YYYYMMDDHHmmss'),
  };

  const urlParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sortParams(vnp_Params))) urlParams.append(k, String(v));
  const signed = crypto.createHmac('sha512', env.VNP_HASH_SECRET).update(urlParams.toString()).digest('hex');
  urlParams.append('vnp_SecureHash', signed);

  const url = `${env.VNP_BASEURL}?${urlParams.toString()}`;
  log.info({ orderId, totalAmount: order.total_amount }, 'VNPay URL generated');
  return url;
};

export const handlePaymentResponse = async (query: Record<string, string>): Promise<{ redirectUrl: string }> => {
  const { vnp_ResponseCode, vnp_TxnRef, vnp_TransactionNo, vnp_Amount } = query;
  log.info({ orderId: vnp_TxnRef, responseCode: vnp_ResponseCode }, 'VNPay callback received');

  if (!vnp_ResponseCode || !vnp_TxnRef) throw new BadRequestError('Missing required VNPay parameters');
  const order = await OrderModel.findById(vnp_TxnRef);
  if (!order) throw new NotFoundError('Order');

  const SUCCESS_URL = 'https://dressify-vesti.vercel.app/success';
  const FAIL_URL = 'https://dressify-vesti.vercel.app/failed';

  if (vnp_ResponseCode !== '00') {
    log.warn({ orderId: vnp_TxnRef, responseCode: vnp_ResponseCode }, 'VNPay payment failed — cleaning up order');
    await OrderDetailModel.deleteMany({ order_id: order._id });
    await OrderModel.findByIdAndDelete(order._id);
    await TransactionModel.create({ order_id: order._id, payment_method: 'vnpay', amount: Number(vnp_Amount) / 100, transaction_id: vnp_TransactionNo, status: 'failed' });
    return { redirectUrl: FAIL_URL };
  }

  order.order_status = 'completed';
  await order.save();
  const orderDetails = await OrderDetailModel.find({ order_id: order._id });
  await Promise.all(orderDetails.map((d) => ProductVariationModel.findByIdAndUpdate(d.variation_id, { $inc: { stock_quantity: -d.quantity } })));
  await TransactionModel.create({ order_id: order._id, payment_method: 'vnpay', amount: Number(vnp_Amount) / 100, transaction_id: vnp_TransactionNo, status: 'completed' });

  log.info({ orderId: vnp_TxnRef, txnNo: vnp_TransactionNo }, 'VNPay payment completed');
  return { redirectUrl: SUCCESS_URL };
};
