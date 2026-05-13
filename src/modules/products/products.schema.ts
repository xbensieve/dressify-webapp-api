import mongoose, { Schema, type Document } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category_id: mongoose.Types.ObjectId;
  seller_id: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductVariation extends Document {
  _id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  size: string;
  color: string;
  price: number;
  stock_quantity: number;
}

export interface IProductImage extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, index: 'text' },
    description: { type: String, default: 'No description provided', trim: true },
    price: { type: Number, required: true, min: 0 },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// Compound index for search queries
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category_id: 1, price: 1 });
productSchema.index({ seller_id: 1, isDeleted: 1 });

const productVariationSchema = new Schema<IProductVariation>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock_quantity: { type: Number, required: true, min: 0, default: 0 },
});
productVariationSchema.index({ product_id: 1 });

const productImageSchema = new Schema<IProductImage>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  imageUrl: { type: String, required: true },
  altText: { type: String },
  displayOrder: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
});

export const ProductModel = mongoose.model<IProduct>('Product', productSchema);
export const ProductVariationModel = mongoose.model<IProductVariation>('ProductVariation', productVariationSchema);
export const ProductImageModel = mongoose.model<IProductImage>('ProductImage', productImageSchema);
