import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Register a new user
export const register = async (req, res) => {
  const { username, first_name, last_name, password, phone, email } = req.body;

  // Validate required fields
  if (!username || !first_name || !last_name || !password || !phone || !email) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  // Validate username length
  if (username.trim().length < 8) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Username must be at least 8 characters long",
      });
  }

  // Validate password length
  if (password.length < 8) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }

  // Validate phone number format
  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number must be 10-15 digits" });
  }

  try {
    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { phone }],
    });

    if (existingUser) {
      const conflictField =
        existingUser.username === username
          ? "Username"
          : existingUser.email === email
          ? "Email"
          : "Phone number";

      return res
        .status(409)
        .json({ success: false, message: `${conflictField} already exists` });
    }

    // Create and save the new user
    const newUser = new User({
      username,
      first_name,
      last_name,
      password_hash: password,
      phone,
      email,
    });
    await newUser.save();

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login a user
export const login = async (req, res) => {
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required" });
  }

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        access_token: token,
      });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
