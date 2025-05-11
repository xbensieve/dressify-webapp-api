import express from "express";
import {
  generatePaymentUrl,
  handlePaymentResponse,
} from "../controllers/vnpay.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VNPay
 *   description: VNPay payment integration
 */

/**
 * @swagger
 * /api/vnpay/generate-payment-url:
 *   post:
 *     summary: Generate VNPay payment URL
 *     tags: [VNPay]
 *     description: Generate a payment URL for VNPay with the provided order details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order.
 *               amount:
 *                 type: number
 *                 description: The total amount to be paid.
 *               returnUrl:
 *                 type: string
 *                 description: The URL to redirect to after payment.
 *     responses:
 *       200:
 *         description: Payment URL generated successfully.
 *       400:
 *         description: Bad request.
 */
router.post("/generate-payment-url", generatePaymentUrl);

/**
 * @swagger
 * /api/vnpay/handle-payment-response:
 *   get:
 *     summary: Handle VNPay payment response
 *     tags: [VNPay]
 *     description: Handle the response from VNPay after payment is completed.
 *     parameters:
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction reference from VNPay.
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         required: true
 *         description: The response code from VNPay.
 *     responses:
 *       200:
 *         description: Payment response handled successfully.
 *       400:
 *         description: Bad request.
 */
router.get("/handle-payment-response", handlePaymentResponse);

export default router;