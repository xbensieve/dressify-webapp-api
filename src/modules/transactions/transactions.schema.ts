import mongoose, { Schema, type Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  order_id: mongoose.Types.ObjectId;
  payment_method: 'vnpay' | 'cod' | 'bank_transfer';
  amount: number;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    payment_method: { type: String, enum: ['vnpay', 'cod', 'bank_transfer'], required: true },
    amount: { type: Number, required: true },
    transaction_id: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
  },
  { timestamps: true },
);

export const TransactionModel = mongoose.model<ITransaction>('Transaction', transactionSchema);
