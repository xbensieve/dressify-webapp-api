import express from "express";
import {
  createOrder,
  createOrderFromCart,
} from "../controllers/order.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createOrder);

router.post("/from-cart", verifyToken, createOrderFromCart);

export default router;
