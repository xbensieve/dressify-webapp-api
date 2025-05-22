import express from "express";
import {
  addToCart,
  getCart,
  deleteCartItem,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
// Get the cart for a user
router.get("/items", verifyToken, getCart);
// Add a product to the cart
router.post("/items", verifyToken, addToCart);
// Update the quantity of a product in the cart
router.put("/items/:cartItemId", verifyToken, updateCartItem);
// Remove a product from the cart
router.delete("/items/:cartItemId", verifyToken, deleteCartItem);

export default router;
