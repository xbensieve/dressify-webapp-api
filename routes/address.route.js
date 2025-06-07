import express from "express";
import { createAddress } from "../controllers/address.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createAddress);

export default router;
