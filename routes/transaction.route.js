import express from "express";
import { getTransactionDetail } from "../controllers/transaction.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:id", verifyToken, getTransactionDetail);

export default router;
