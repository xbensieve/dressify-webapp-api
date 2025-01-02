import express from "express";
import { generatePaymentUrl } from "../controllers/vnpay.controller.js";

const router = express.Router();

router.post("/generate-payment-url", generatePaymentUrl);

export default router;
