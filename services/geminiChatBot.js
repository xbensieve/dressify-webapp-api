// services/geminiChatBot.js
import axios from "axios";
import redisClient from "../config/redis.js"; // Adjust path if necessary

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

export async function fetchAIResponse(userId, promptText) {
  try {
    const chatHistoryKey = `chat:${userId}`;
    let chatHistory = await redisClient.get(chatHistoryKey);
    chatHistory = chatHistory ? JSON.parse(chatHistory) : [];
    chatHistory.push({ role: "user", text: promptText });

    const conversationPrompt = chatHistory
      .map((msg) => `${msg.role}: ${msg.text}`)
      .join("\n");

    const response = await axios.post(GEMINI_API_URL, {
      contents: [{ parts: [{ text: conversationPrompt }] }],
    });

    const result = response.data;
    const aiResponse =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    chatHistory.push({ role: "assistant", text: aiResponse });
    await redisClient.setEx(chatHistoryKey, 3600, JSON.stringify(chatHistory));

    return { response: aiResponse, history: chatHistory };
  } catch (error) {
    console.error(
      "Error calling Gemini API or Redis:",
      error.response?.data || error.message
    );
    throw error;
  }
}
