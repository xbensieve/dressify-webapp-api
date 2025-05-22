import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/product.route.js";
import userRoutes from "./routes/user.route.js";
import orderRoutes from "./routes/order.route.js";
import vnpayRoutes from "./routes/vnpay.route.js";
import categoryRoutes from "./routes/category.route.js";
import generalRoutes from "./routes/general.route.js";
import cartRoutes from "./routes/cart.route.js";

dotenv.config();

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use(cors());

app.use(express.json());

app.use(helmet());

app.use("/", generalRoutes);

//app.use("/api", limiter);

app.use("/api/products", productRoutes);

app.use("/api/users", userRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/vnpay", vnpayRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/carts", cartRoutes);

app.listen(5000, () => {
  connectDB();
  console.log("Server started at http://localhost:5000");
});
