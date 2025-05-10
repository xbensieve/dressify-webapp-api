import mongoose from "mongoose";

const orderDetailSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price_at_purchase: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const OrderDetail = mongoose.model("OrderDetail", orderDetailSchema);
export default OrderDetail;
