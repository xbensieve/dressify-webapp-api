import ProductVariation from "../models/productVariation.model.js";
import Order from "../models/order.model.js";
import OrderDetail from "../models/orderDetail.model.js";
import CartItem from "../models/cartItem.model.js";
import Product from "../models/product.model.js";
import ProductImage from "../models/productImage.model.js";
import Address from "../models/address.model.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  const { id } = req.user;
  const { products } = req.body;

  if (!products) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const addresses = await Address.find({ user_id: id }).lean();
  const defaultAddress = addresses.find((addr) => addr.is_default);

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
      address_id: defaultAddress._id,
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
  const { cartItemIds } = req.body;
  if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Selected cart items are required",
    });
  }

  const addresses = await Address.find({ user_id: id }).lean();
  const defaultAddress = addresses.find((addr) => addr.is_default);

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
      address_id: defaultAddress._id,
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

export const getOrdersByUser = async (req, res) => {
  const { id } = req.user;
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
  const skip = (page - 1) * limit;
  try {
    const totalOrders = await Order.countDocuments({ user_id: id });

    const orders = await Order.find({ user_id: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const details = await OrderDetail.find({ order_id: order._id })
          .populate({
            path: "product_id",
            model: Product,
            select: "name description price category_id seller_id",
          })
          .populate({
            path: "variation_id",
            model: ProductVariation,
            select: "size color price stock_quantity",
          })
          .lean();

        const detailsWithImages = await Promise.all(
          details.map(async (detail) => {
            const images = await ProductImage.find({
              productId: detail.product_id?._id || detail.product_id,
            })
              .sort({ isPrimary: -1, displayOrder: 1 })
              .select("imageUrl isPrimary displayOrder altText -_id")
              .lean();
            return {
              ...detail,
              images,
            };
          })
        );

        return {
          ...order,
          details: detailsWithImages,
        };
      })
    );

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      orders: ordersWithDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
