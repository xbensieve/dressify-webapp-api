import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as aiChatService from '@modules/ai-chat/ai-chat.service';
import { cacheService } from '@infrastructure/cache/cache.service';

vi.mock('axios');

describe('AIChatService Unit Tests', () => {
  const userId = 'user123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAIResponse', () => {
    it('should generate response and append to history in cache', async () => {
      const chatHistory: aiChatService.ChatMessage[] = [
        { role: 'user', text: 'hello' },
        { role: 'assistant', text: 'hi there' },
      ];

      // Stub cache get to return existing history
      vi.mocked(cacheService.get).mockResolvedValueOnce(chatHistory);

      // Stub axios response from Gemini API
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'I am your assistant.' }],
              },
            },
          ],
        },
      });

      const result = await aiChatService.fetchAIResponse(userId, 'who are you?');

      expect(result.response).toBe('I am your assistant.');
      expect(result.history).toHaveLength(4);
      expect(result.history[2]).toEqual({ role: 'user', text: 'who are you?' });
      expect(result.history[3]).toEqual({ role: 'assistant', text: 'I am your assistant.' });

      // Verify cached history update
      expect(cacheService.set).toHaveBeenCalledWith(`chat:${userId}`, result.history, 3600);
    });

    it('should fall back to default text if candidate content is missing in Gemini response', async () => {
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {}, // empty response
      });

      const result = await aiChatService.fetchAIResponse(userId, 'test');
      expect(result.response).toBe('No response from AI');
    });
  });

  describe('getChatHistory', () => {
    it('should return empty list if no history exists', async () => {
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      const result = await aiChatService.getChatHistory(userId);
      expect(result).toEqual([]);
    });

    it('should return history array if it exists in cache', async () => {
      const history = [{ role: 'user', text: 'hello' }];
      vi.mocked(cacheService.get).mockResolvedValueOnce(history);
      const result = await aiChatService.getChatHistory(userId);
      expect(result).toBe(history);
    });
  });

  describe('clearChatHistory', () => {
    it('should call del on cacheService with correct key', async () => {
      await aiChatService.clearChatHistory(userId);
      expect(cacheService.del).toHaveBeenCalledWith(`chat:${userId}`);
    });
  });
});
