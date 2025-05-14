import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mailer from "../utils/mailer.js";
import { verify } from "../services/googleAuth.js";
import { generateTokens } from "../utils/token.js";
dotenv.config();

// Register a new user
export const register = async (req, res) => {
  const { username, first_name, last_name, password, phone, email, role } =
    req.body;

  // Validate required fields
  if (!username || !first_name || !last_name || !password || !phone || !email) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  // Validate username length
  if (username.trim().length < 8) {
    return res.status(400).json({
      success: false,
      message: "Username must be at least 8 characters long",
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
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

    const validRoles = ["customer", "admin", "seller"];
    if (!validRoles.includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role provided" });
    }

    //Generate confirmation code
    const confirmationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    //Send confirmation email
    const emailSubject = "Confirm Your Email - XBensieve Registration";

    const emailMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      padding: 30px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #004e89;
      margin: 0;
    }
    .message {
      font-size: 16px;
      color: #333333;
      line-height: 1.5;
    }
    .code {
      font-size: 24px;
      color: #004e89;
      background-color: #eef3f9;
      padding: 12px 20px;
      display: inline-block;
      border-radius: 6px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 20px 0;
    }
    .footer {
      font-size: 12px;
      color: #999999;
      text-align: center;
      margin-top: 40px;
    }
    @media screen and (max-width: 600px) {
      .container {
        padding: 20px 15px;
      }
      .code {
        font-size: 20px;
        padding: 10px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to XBensieve</h1>
      <p style="margin: 5px 0; color: #666;">Complete Your Registration</p>
    </div>
    <div class="message">
      <p>Hello,</p>
      <p>Thank you for signing up with <strong>XBensieve</strong>. To activate your account, please enter the confirmation code below:</p>
      <div class="code">${confirmationCode}</div>
      <p>This code is valid for the next 24 hours. If you did not request this, please disregard this message.</p>
      <p>We’re excited to have you on board!</p>
      <p>— The XBensieve Team</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} XBensieve. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    // Create and save the new user
    const newUser = new User({
      username,
      first_name,
      last_name,
      password_hash: password,
      phone,
      email,
      role,
      status: "active",
      isConfirmed: false,
      confirmationCode,
      expireConfirmationCode: Date.now() + 24 * 60 * 60 * 1000,
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Confirmation code sent to your email. Please verify.",
    });

    // Send confirmation email
    mailer.sendMail(email, emailSubject, emailMessage).catch((error) => {
      console.error("Error sending confirmation email:", error.message);
    });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res
      .status(500)
      .json({ success: false, message: `Log error: ${error.message}` });
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

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Google login
export const loginGoogle = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "Token is required" });
  }

  try {
    const userData = await verify(token);

    // Check if the user already exists
    let user = await User.findOne({ googleId: userData.id });

    if (!user) {
      // Create a new user if not found
      user = new User({
        username: userData.email,
        first_name: userData.family_name,
        last_name: userData.given_name,
        password_hash: null,
        phone: null,
        email: userData.email,
        role: "customer",
        status: "active",
        isConfirmed: true,
        googleId: userData.id,
        avatar: userData.picture,
      });
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("Error during Google login:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//Endpoint refreshToken
export const refreshAccessToken = async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }

  try {
    jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET, (err, user) => {
      if (err) {
        return res
          .status(403)
          .json({ success: false, message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.status(200).json({
        success: true,
        access_token: newAccessToken,
      });
    });
  } catch (error) {
    console.error("Error during token refresh:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
