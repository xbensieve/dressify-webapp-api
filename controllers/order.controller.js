import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import OrderDetail from "../models/orderDetail.model.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  const { userId, products, method, address } = req.body;

  if (!userId || !products || !method || !address) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    for (const item of products) {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }
      if (!product.colors.includes(item.color)) {
        throw new Error(
          `Color ${item.color} is not available for this product`
        );
      }
      if (!product.sizes.includes(item.size)) {
        throw new Error(`Size ${item.size} is not available for this product`);
      }
      const availableStock = product.stock;

      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      totalAmount += item.unitPrice * item.quantity;
    }

    const order = new Order({
      userId,
      amount: totalAmount,
      method,
      address,
    });

    const saveOrder = await order.save({ session });

    for (const item of products) {
      const orderDetail = new OrderDetail({
        orderId: saveOrder._id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        color: item.color,
        size: item.size,
      });
      await orderDetail.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      orderId: saveOrder._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
