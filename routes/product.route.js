import express from "express";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "../controllers/product.controller.js";
const router = express.Router();
router.get("/", getProducts);

router.get("/:id", getProductById);

router.post("/", addProduct);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;
