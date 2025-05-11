import express from "express";
import { createOrder } from "../controllers/order.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Order
 *   description: Order management
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Order]
 *     description: Place a new order with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 description: List of items in the order.
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: The ID of the product.
 *                     quantity:
 *                       type: integer
 *                       description: The quantity of the product.
 *               totalPrice:
 *                 type: number
 *                 description: The total price of the order.
 *     responses:
 *       201:
 *         description: Order created successfully.
 *       400:
 *         description: Bad request.
 */
router.post("/", createOrder);

export default router;
