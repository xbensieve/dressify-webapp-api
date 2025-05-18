import express from "express";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "../controllers/product.controller.js";
import multer from "multer";
import { verifyToken, requireAdmin } from "../middlewares/authMiddleware.js";

const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post("/", verifyToken, requireAdmin, upload.array("images"), addProduct);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;
