import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    payment_method: {
      type: String,
      enum: ["credit_card", "vnpay", "paypal", "bank_transfer"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transaction_id: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "failed",
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", paymentSchema);
export default Transaction;
