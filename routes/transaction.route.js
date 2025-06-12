import express from "express";
import { getTransactionDetail } from "../controllers/transaction.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:id", verifyToken, requireAdmin, getTransactionDetail);

export default router;
