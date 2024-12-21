import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/product.route.js";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors());

app.use(express.json()); //allows us to accept JSON data in the body

app.use("/api/products", productRoutes);

app.listen(5000, () => {
  connectDB();
  console.log("Server started at http://localhost:5000");
});
