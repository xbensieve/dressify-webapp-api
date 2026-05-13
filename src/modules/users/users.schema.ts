import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  first_name: string;
  last_name: string;
  password_hash: string | null;
  phone?: string;
  email: string;
  avatar?: string | null;
  DOB?: Date | null;
  role: 'customer' | 'admin' | 'seller';
  status: 'active' | 'inactive';
  isConfirmed: boolean;
  confirmationCode?: string | null;
  expireConfirmationCode?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(input: string): Promise<boolean>;
}

export type CreateUserDto = Omit<
  IUser,
  '_id' | 'createdAt' | 'updatedAt' | 'comparePassword' | 'id'
>;

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    password_hash: { type: String, default: null },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    avatar: { type: String, default: null },
    DOB: { type: Date, default: null },
    role: { type: String, enum: ['customer', 'admin', 'seller'], required: true, default: 'customer' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    isConfirmed: { type: Boolean, default: false, index: true },
    confirmationCode: { type: String, default: null },
    expireConfirmationCode: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password_hash;
        delete ret.confirmationCode;
        delete ret.expireConfirmationCode;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash') || !this.password_hash) return next();
  const salt = await bcrypt.genSalt(12);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

userSchema.methods.comparePassword = function (input: string): Promise<boolean> {
  if (!this.password_hash) return Promise.resolve(false);
  return bcrypt.compare(input, this.password_hash);
};

// Compound index for uniqueness search during registration
userSchema.index({ username: 1, email: 1, phone: 1 });

export const UserModel = mongoose.model<IUser>('User', userSchema);
