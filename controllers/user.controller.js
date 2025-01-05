import User from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const register = async (req, res) => {
  const user = req.body;
  if (!user.username || !user.password || !user.email || !user.phoneNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  if (user.username.trim().length < 8) {
    return res.status(400).json({
      success: false,
      message: "Username must be at least 8 characters long",
    });
  }

  if (user.password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 character long",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(user.phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be 10-15 digits",
    });
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { username: user.username },
        { email: user.email },
        { phoneNumber: user.phoneNumber },
      ],
    });
    if (existingUser) {
      const conflictField =
        existingUser.username === user.username
          ? "Username"
          : existingUser.email === user.email
          ? "Email"
          : "Phone number";

      return res.status(409).json({
        success: false,
        message: `${conflictField} already exists`,
      });
    }

    const newUser = new User(user);
    await newUser.save();
    res.status(201).json({ success: true, message: "Register successful" });
  } catch (error) {
    console.error("Error during registration:", error.message);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res
        .status(400)
        .json({ success: false, message: `${field} already exists` });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      access_token: token,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
