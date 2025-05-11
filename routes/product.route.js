import express from "express";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "../controllers/product.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Product
 *   description: Product management
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Product]
 *     description: Retrieve a list of all products.
 *     responses:
 *       200:
 *         description: A list of products.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The product ID.
 *                   name:
 *                     type: string
 *                     description: The product name.
 *                   price:
 *                     type: number
 *                     description: The product price.
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Product]
 *     description: Retrieve a single product by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID.
 *     responses:
 *       200:
 *         description: Product retrieved successfully.
 *       404:
 *         description: Product not found.
 */
router.get("/:id", getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Add a new product
 *     tags: [Product]
 *     description: Create a new product with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The product name.
 *               price:
 *                 type: number
 *                 description: The product price.
 *               description:
 *                 type: string
 *                 description: The product description.
 *     responses:
 *       201:
 *         description: Product created successfully.
 *       400:
 *         description: Bad request.
 */
router.post("/", addProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Product]
 *     description: Update an existing product by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The product name.
 *               price:
 *                 type: number
 *                 description: The product price.
 *               description:
 *                 type: string
 *                 description: The product description.
 *     responses:
 *       200:
 *         description: Product updated successfully.
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Product not found.
 */
router.put("/:id", updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Product]
 *     description: Remove a product by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID.
 *     responses:
 *       200:
 *         description: Product deleted successfully.
 *       404:
 *         description: Product not found.
 */
router.delete("/:id", deleteProduct);

export default router;
