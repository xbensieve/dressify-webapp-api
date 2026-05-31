import mongoose, { Schema, type Document } from 'mongoose';

// ─── Voucher ──────────────────────────────────────────────────────────────────

export type VoucherType = 'percentage' | 'fixed';
export type VoucherStatus = 'active' | 'inactive' | 'expired';

export interface IVoucher extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;                      // Unique, uppercase
  type: VoucherType;
  discount_value: number;            // % (0-100) or flat amount
  min_order_amount: number;          // Minimum cart total to apply
  max_discount_amount?: number;      // Cap for percentage vouchers
  usage_limit: number;               // Global max uses
  usage_count: number;               // Atomically incremented
  per_user_limit: number;            // Max uses per unique user
  applicable_product_ids: mongoose.Types.ObjectId[]; // [] = all products
  status: VoucherStatus;
  starts_at: Date;
  expires_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const voucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    discount_value: { type: Number, required: true, min: 0 },
    min_order_amount: { type: Number, default: 0, min: 0 },
    max_discount_amount: { type: Number },
    usage_limit: { type: Number, required: true, min: 1 },
    usage_count: { type: Number, default: 0, min: 0 },
    per_user_limit: { type: Number, default: 1, min: 1 },
    applicable_product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active', index: true },
    starts_at: { type: Date, required: true },
    expires_at: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

voucherSchema.index({ code: 1, status: 1 });
voucherSchema.index({ expires_at: 1, status: 1 }); // TTL-style compound for expiry queries

// ─── VoucherUsage (per-user idempotency store) ────────────────────────────────

export interface IVoucherUsage extends Document {
  _id: mongoose.Types.ObjectId;
  voucher_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  order_id?: mongoose.Types.ObjectId;
  used_at: Date;
}

const voucherUsageSchema = new Schema<IVoucherUsage>({
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order' },
  used_at: { type: Date, default: Date.now },
});

// Compound unique ensures one usage record per user per voucher (per_user_limit=1 default)
voucherUsageSchema.index({ voucher_id: 1, user_id: 1 });

// ─── FlashSale ────────────────────────────────────────────────────────────────

export interface IFlashSale extends Document {
  _id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  variation_id: mongoose.Types.ObjectId;
  sale_price: number;
  reserved_quantity: number;         // Total units allocated to the flash sale
  sold_quantity: number;             // Atomically incremented on reservation
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const flashSaleSchema = new Schema<IFlashSale>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variation_id: { type: Schema.Types.ObjectId, ref: 'ProductVariation', required: true },
    sale_price: { type: Number, required: true, min: 0 },
    reserved_quantity: { type: Number, required: true, min: 1 },
    sold_quantity: { type: Number, default: 0, min: 0 },
    starts_at: { type: Date, required: true, index: true },
    ends_at: { type: Date, required: true, index: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

flashSaleSchema.index({ variation_id: 1, is_active: 1 });
flashSaleSchema.index({ starts_at: 1, ends_at: 1, is_active: 1 });

export const VoucherModel = mongoose.model<IVoucher>('Voucher', voucherSchema);
export const VoucherUsageModel = mongoose.model<IVoucherUsage>('VoucherUsage', voucherUsageSchema);
export const FlashSaleModel = mongoose.model<IFlashSale>('FlashSale', flashSaleSchema);
