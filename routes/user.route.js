import express from "express";
import {
  register,
  login,
  loginGoogle,
  refreshAccessToken,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/refresh-token", refreshAccessToken);

router.post("/login-google", loginGoogle);

export default router;
