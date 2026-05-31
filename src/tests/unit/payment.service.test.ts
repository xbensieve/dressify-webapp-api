import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as paymentService from '@modules/payment/payment.service';
import { OrderModel, OrderDetailModel } from '@modules/orders/orders.schema';
import { TransactionModel } from '@modules/transactions/transactions.schema';
import { ProductVariationModel } from '@modules/products/products.schema';

describe('PaymentService Unit Tests', () => {
  let orderId: string;
  let variationId: string;

  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderDetailModel.deleteMany({});
    await TransactionModel.deleteMany({});
    await ProductVariationModel.deleteMany({});

    const variation = await ProductVariationModel.create({
      product_id: new mongoose.Types.ObjectId(),
      size: 'S',
      color: 'Black',
      price: 50,
      stock_quantity: 10,
    });
    variationId = variation._id.toString();

    const order = await OrderModel.create({
      user_id: new mongoose.Types.ObjectId(),
      address_id: new mongoose.Types.ObjectId(),
      total_amount: 100,
      order_status: 'pending',
    });
    orderId = order._id.toString();

    await OrderDetailModel.create({
      order_id: order._id,
      product_id: variation.product_id,
      variation_id: variation._id,
      quantity: 2,
      price_at_purchase: 50,
    });
  });

  describe('generatePaymentUrl', () => {
    it('should throw BadRequestError if order ID is missing', async () => {
      await expect(
        paymentService.generatePaymentUrl(''),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should throw NotFoundError if order does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        paymentService.generatePaymentUrl(fakeId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should generate a valid payment URL with secure hash', async () => {
      const url = await paymentService.generatePaymentUrl(orderId);
      expect(url).toBeTruthy();
      expect(url).toContain('https://sandbox.vnpayment.vn');
      expect(url).toContain('vnp_SecureHash=');
      expect(url).toContain(`vnp_TxnRef=${orderId}`);
    });
  });

  describe('handlePaymentResponse', () => {
    it('should throw BadRequestError if vnp_ResponseCode or vnp_TxnRef is missing', async () => {
      await expect(
        paymentService.handlePaymentResponse({ vnp_TxnRef: orderId }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should throw NotFoundError if order does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        paymentService.handlePaymentResponse({ vnp_ResponseCode: '00', vnp_TxnRef: fakeId }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should handle failed payment response by deleting order and creating failed transaction record', async () => {
      const query = {
        vnp_ResponseCode: '24', // payment canceled by user
        vnp_TxnRef: orderId,
        vnp_TransactionNo: '123456',
        vnp_Amount: '260000000', // 100 * 100 * 26000
      };

      const result = await paymentService.handlePaymentResponse(query);
      expect(result.redirectUrl).toBe('https://dressify-vesti.vercel.app/failed');

      // Order should be deleted
      const orderInDb = await OrderModel.findById(orderId);
      expect(orderInDb).toBeNull();

      const detailsInDb = await OrderDetailModel.find({ order_id: orderId });
      expect(detailsInDb).toHaveLength(0);

      // Transaction should be saved as failed
      const txn = await TransactionModel.findOne({ order_id: orderId });
      expect(txn).toBeTruthy();
      expect(txn!.status).toBe('failed');
      expect(txn!.amount).toBe(2600000); // 260000000 / 100
    });

    it('should handle successful payment response by updating order to completed and adjusting stock', async () => {
      const query = {
        vnp_ResponseCode: '00', // success
        vnp_TxnRef: orderId,
        vnp_TransactionNo: '654321',
        vnp_Amount: '260000000',
      };

      const result = await paymentService.handlePaymentResponse(query);
      expect(result.redirectUrl).toBe('https://dressify-vesti.vercel.app/success');

      // Order should be completed
      const orderInDb = await OrderModel.findById(orderId);
      expect(orderInDb!.order_status).toBe('completed');

      // Stock should be decremented
      const variationInDb = await ProductVariationModel.findById(variationId);
      expect(variationInDb!.stock_quantity).toBe(8); // 10 - 2

      // Transaction should be saved as completed
      const txn = await TransactionModel.findOne({ order_id: orderId });
      expect(txn).toBeTruthy();
      expect(txn!.status).toBe('completed');
    });
  });
});
