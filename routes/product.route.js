import express from "express";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  searchProducts,
} from "../controllers/product.controller.js";
import multer from "multer";
import { verifyToken, requireAdmin } from "../middlewares/authMiddleware.js";

const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.get("/search", searchProducts);

router.post("/id", getProductById);

router.post("/", verifyToken, requireAdmin, upload.array("images"), addProduct);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;
