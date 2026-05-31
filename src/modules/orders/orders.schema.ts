import mongoose, { Schema, type Document } from 'mongoose';

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  address_id: mongoose.Types.ObjectId;
  order_status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDetail extends Document {
  _id: mongoose.Types.ObjectId;
  order_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  variation_id: mongoose.Types.ObjectId;
  quantity: number;
  price_at_purchase: number;
}

const orderSchema = new Schema<IOrder>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    order_status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending', index: true },
    total_amount: { type: Number, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ user_id: 1, createdAt: -1 });

const orderDetailSchema = new Schema<IOrderDetail>({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variation_id: { type: Schema.Types.ObjectId, ref: 'ProductVariation', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price_at_purchase: { type: Number, required: true },
});

export const OrderModel = mongoose.model<IOrder>('Order', orderSchema);
export const OrderDetailModel = mongoose.model<IOrderDetail>('OrderDetail', orderDetailSchema);
