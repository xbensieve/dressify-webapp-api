import mongoose, { Schema, type Document } from 'mongoose';

export interface IAddress extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  district: string;
  ward: string;
  is_default: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    address_line: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    is_default: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

addressSchema.index({ user_id: 1, is_default: 1 });

export const AddressModel = mongoose.model<IAddress>('Address', addressSchema);
