import User from "../models/user.model.js";
import mongoose from "mongoose";

export const register = async (req, res) => {
  const user = req.body;
  let message = "";
  if (
    !user.username ||
    !user.password ||
    !user.email ||
    !user.phoneNumber ||
    !user.address
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  if (user.username.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "Username must be at least 3 characters long",
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

  if (user.address.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Address must not be empty",
    });
  }

  try {
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
    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
