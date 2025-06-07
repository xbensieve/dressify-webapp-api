import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/product.route.js";
import userRoutes from "./routes/user.route.js";
import orderRoutes from "./routes/order.route.js";
import vnpayRoutes from "./routes/vnpay.route.js";
import categoryRoutes from "./routes/category.route.js";
import generalRoutes from "./routes/general.route.js";
import cartRoutes from "./routes/cart.route.js";
import addressRoutes from "./routes/address.route.js";
import { fetchAIResponse } from "./services/geminiChatBot.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket, req) => {
  console.log("WebSocket client connected");

  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const userId =
    urlParams.get("userId") || `user_${Math.random().toString(36).slice(2)}`;

  socket.on("message", async (message) => {
    try {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        data = { type: "message", text: message.toString() };
      }

      if (data.type === "init") {
        // Fetch existing chat history from Redis
        const chatHistoryKey = `chat:${userId}`;
        let chatHistory = await redisClient.get(chatHistoryKey);
        chatHistory = chatHistory ? JSON.parse(chatHistory) : [];
        socket.send(
          JSON.stringify({ userId, response: "", history: chatHistory })
        );
      } else if (data.type === "clear") {
        // Clear chat history for the user
        const chatHistoryKey = `chat:${data.userId}`;
        await redisClient.del(chatHistoryKey);
        console.log(`Cleared chat history for user: ${data.userId}`);
        socket.send(
          JSON.stringify({ userId: data.userId, response: "", history: [] })
        );
      } else {
        // Handle regular chat message
        console.log(`Received from ${userId}: ${data.text || message}`);
        const { response, history } = await fetchAIResponse(
          userId,
          data.text || message
        );
        socket.send(JSON.stringify({ userId, response, history }));
      }
    } catch (error) {
      socket.send(JSON.stringify({ error: "Failed to process message" }));
    }
  });

  socket.on("close", () => {
    console.log(`WebSocket client disconnected: ${userId}`);
  });
});

app.use(cors());
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/", generalRoutes);

//app.use("/api", limiter);

app.use("/api/products", productRoutes);

app.use("/api/users", userRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/vnpay", vnpayRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/carts", cartRoutes);

app.use("/api/addresses", addressRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  connectDB();
  console.log(`HTTP server started at http://localhost:${PORT}`);
  console.log(`WebSocket server running at ws://localhost:${PORT}`);
});
