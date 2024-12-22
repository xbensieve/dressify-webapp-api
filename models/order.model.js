import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, "Amount must be a positive value"],
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Completed", "Cancelled"],
    default: "Pending",
  },
  method: {
    type: String,
    enum: ["COD", "VNPAY", "PayPal", "CreditCard"],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
