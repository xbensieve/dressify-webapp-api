import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/product.route.js";
import userRoutes from "./routes/user.route.js";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/products", productRoutes);

app.use("/api/users", userRoutes);

app.listen(5000, () => {
  connectDB();
  console.log("Server started at http://localhost:5000");
});
