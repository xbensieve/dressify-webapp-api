import express from "express";
import {
  getAllUsers,
  updateUserStatus,
  getAllOrders,
  updateOrderStatus,
  getStatistics,
} from "../controllers/admin.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User management
router.get("/users", verifyToken, requireAdmin, getAllUsers);
router.patch("/users/:id/status", verifyToken, requireAdmin, updateUserStatus);

// Order management
router.get("/orders", verifyToken, requireAdmin, getAllOrders);
router.patch(
  "/orders/:id/status",
  verifyToken,
  requireAdmin,
  updateOrderStatus
);

// Statistics
router.get("/statistics", verifyToken, requireAdmin, getStatistics);

export default router;
