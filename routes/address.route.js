import express from "express";
import {
  createAddress,
  setDefaultAddress,
  editAddress,
  deleteAddress,
} from "../controllers/address.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createAddress);
// Set as default address
router.patch("/:addressId/default", verifyToken, setDefaultAddress);

// Edit address
router.put("/:addressId", verifyToken, editAddress);

// Delete address
router.delete("/:addressId", verifyToken, deleteAddress);

export default router;
