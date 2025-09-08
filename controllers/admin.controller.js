import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password_hash");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update user status (active/inactive)
export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select("-password_hash");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user status:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user_id", "username email")
      .populate("address_id");
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!["pending", "completed"].includes(order_status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { order_status },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { order_status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);

    const totalProducts = await Product.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
