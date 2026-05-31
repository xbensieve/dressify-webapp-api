import axios from 'axios';
import { cacheService } from '@infrastructure/cache/cache.service';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
const CHAT_HISTORY_TTL = 3600; // 1 hour

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatResponse {
  response: string;
  history: ChatMessage[];
}

/**
 * Fetches AI response from Gemini and maintains per-user chat history in Redis.
 */
export const fetchAIResponse = async (userId: string, promptText: string): Promise<ChatResponse> => {
  const chatHistoryKey = `chat:${userId}`;

  const chatHistory = (await cacheService.get<ChatMessage[]>(chatHistoryKey)) ?? [];
  chatHistory.push({ role: 'user', text: promptText });

  const conversationPrompt = chatHistory.map((msg) => `${msg.role}: ${msg.text}`).join('\n');

  const response = await axios.post<{
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  }>(GEMINI_API_URL, {
    contents: [{ parts: [{ text: conversationPrompt }] }],
  });

  const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from AI';

  chatHistory.push({ role: 'assistant', text: aiResponse });
  await cacheService.set(chatHistoryKey, chatHistory, CHAT_HISTORY_TTL);

  logger.debug({ userId, responseLength: aiResponse.length }, 'AI response generated');

  return { response: aiResponse, history: chatHistory };
};

export const clearChatHistory = async (userId: string): Promise<void> => {
  await cacheService.del(`chat:${userId}`);
  logger.info({ userId }, 'Chat history cleared');
};

export const getChatHistory = async (userId: string): Promise<ChatMessage[]> => {
  return (await cacheService.get<ChatMessage[]>(`chat:${userId}`)) ?? [];
};
