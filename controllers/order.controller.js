import ProductVariation from "../models/productVariation.model.js";
import Order from "../models/order.model.js";
import OrderDetail from "../models/orderDetail.model.js";
import CartItem from "../models/cartItem.model.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  const { id } = req.user;
  const { address_id, products } = req.body;

  if (!address_id || !products) {
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
      const product = await ProductVariation.findById(item._id);

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const availableStock = product.stock_quantity;

      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      totalAmount += item.price * item.quantity;
    }

    const order = new Order({
      user_id: id,
      address_id: address_id,
      total_amount: totalAmount,
    });

    const saveOrder = await order.save({ session });

    for (const item of products) {
      const orderDetail = new OrderDetail({
        order_id: saveOrder._id,
        product_id: item.product_id,
        variation_id: item._id,
        quantity: item.quantity,
        price_at_purchase: item.price,
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

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const createOrderFromCart = async (req, res) => {
  const { id } = req.user;
  const { address_id, cartItemIds } = req.body;
  if (
    !address_id ||
    !cartItemIds ||
    !Array.isArray(cartItemIds) ||
    cartItemIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Address and selected cart items are required",
    });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cartItems = await CartItem.find({
      _id: { $in: cartItemIds },
    }).session(session);

    if (cartItems.length !== cartItemIds.length) {
      throw new Error("Some cart items not found");
    }

    let totalAmount = 0;
    const orderDetails = [];

    for (const item of cartItems) {
      const variation = await ProductVariation.findById(
        item.variation_id
      ).session(session);
      if (!variation) throw new Error("Product variation not found");

      if (variation.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for variation ${variation._id}`);
      }

      totalAmount += variation.price * item.quantity;

      orderDetails.push({
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        price_at_purchase: variation.price,
      });
    }

    const order = new Order({
      user_id: id,
      address_id,
      total_amount: totalAmount,
    });
    const savedOrder = await order.save({ session });

    for (const detail of orderDetails) {
      await new OrderDetail({
        order_id: savedOrder._id,
        ...detail,
      }).save({ session });
    }

    await CartItem.deleteMany({ _id: { $in: cartItemIds } }).session(session);

    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({
      success: true,
      message: "Order created and cart items removed",
      orderId: savedOrder._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
