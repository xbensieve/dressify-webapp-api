import mongoose, { Schema, type Document } from 'mongoose';

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  total_price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem extends Document {
  _id: mongoose.Types.ObjectId;
  cart_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  variation_id: mongoose.Types.ObjectId;
  quantity: number;
}

const cartSchema = new Schema<ICart>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    total_price: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const cartItemSchema = new Schema<ICartItem>({
  cart_id: { type: Schema.Types.ObjectId, ref: 'Cart', required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variation_id: { type: Schema.Types.ObjectId, ref: 'ProductVariation', required: true },
  quantity: { type: Number, required: true, min: 1 },
});

cartItemSchema.index({ cart_id: 1, product_id: 1, variation_id: 1 }, { unique: true });

export const CartModel = mongoose.model<ICart>('Cart', cartSchema);
export const CartItemModel = mongoose.model<ICartItem>('CartItem', cartItemSchema);
