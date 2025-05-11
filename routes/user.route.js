import express from "express";
import {
  register,
  login,
  loginGoogle,
  refreshAccessToken,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     description: Create a new user account with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user.
 *               password:
 *                 type: string
 *                 description: The password of the user.
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Bad request.
 */
router.post("/register", register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [User]
 *     description: Authenticate a user with their credentials.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user.
 *               password:
 *                 type: string
 *                 description: The password of the user.
 *     responses:
 *       200:
 *         description: User logged in successfully.
 *       401:
 *         description: Unauthorized.
 */
router.post("/login", login);

/**
 * @swagger
 * /api/users/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [User]
 *     description: Generate a new access token using a refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token.
 *     responses:
 *       200:
 *         description: Access token refreshed successfully.
 *       401:
 *         description: Unauthorized.
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * @swagger
 * /api/users/login-google:
 *   post:
 *     summary: Login with Google
 *     tags: [User]
 *     description: Authenticate a user using their Google account.
 *     responses:
 *       200:
 *         description: User logged in successfully with Google.
 *       401:
 *         description: Unauthorized.
 */
router.post("/login-google", loginGoogle);

export default router;
