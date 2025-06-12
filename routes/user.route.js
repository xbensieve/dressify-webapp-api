import express from "express";
import {
  register,
  login,
  loginGoogle,
  refreshAccessToken,
  profile,
  activateAccount,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/refresh-token", refreshAccessToken);

router.post("/login-google", loginGoogle);

router.get("/me", verifyToken, profile);

router.get("/activate", activateAccount);

export default router;
