import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    password_hash: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    DOB: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "seller"],
      required: true,
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    confirmationCode: {
      type: String,
      default: null,
    },
    expireConfirmationCode: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const user = this;

  if (!user.isModified("password_hash") || !user.password_hash) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(user.password_hash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password_hash);
};

const User = mongoose.model("User", userSchema);

export default User;
