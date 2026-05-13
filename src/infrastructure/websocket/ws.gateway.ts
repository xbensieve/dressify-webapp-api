import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server } from 'http';
import { cacheService } from '@infrastructure/cache/cache.service';
import { redisClient } from '@infrastructure/cache/redis.client';
import { logger } from '@shared/logger/pino';
import { fetchAIResponse } from '@modules/ai-chat/ai-chat.service';

type WsMessageType = 'init' | 'clear' | 'message' | 'ping';

interface WsMessage {
  type: WsMessageType;
  text?: string;
  userId?: string;
}

interface WsResponse {
  userId: string;
  response: string;
  history: Array<{ role: string; text: string }>;
  error?: string;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const CLIENT_TIMEOUT_MS = 60_000;

// Subscriber client for Redis pub/sub (separate from main client)
let subscriber: ReturnType<typeof redisClient.duplicate>;

/**
 * Initialize the WebSocket gateway with Redis pub/sub for horizontal scaling.
 */
export const initWebSocketGateway = (httpServer: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server: httpServer });

  // Set up Redis subscriber for pub/sub scaling
  subscriber = redisClient.duplicate();
  void subscriber.connect();
  void subscriber.subscribe('ws:broadcast', (message: string) => {
    const payload = JSON.parse(message) as { targetUserId?: string; data: unknown };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload.data));
      }
    });
  });

  wss.on('connection', (socket, req) => {
    const urlParams = new URLSearchParams(req.url?.split('?')[1] ?? '');
    const userId = urlParams.get('userId') ?? `anon_${Math.random().toString(36).slice(2)}`;

    logger.info({ userId }, 'WebSocket client connected');

    // Heartbeat
    let isAlive = true;
    socket.on('pong', () => {
      isAlive = true;
    });

    const heartbeat = setInterval(() => {
      if (!isAlive) {
        logger.warn({ userId }, 'WebSocket client timed out — terminating');
        socket.terminate();
        return;
      }
      isAlive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL_MS);

    // Inactivity timeout
    let inactivityTimer = setTimeout(() => {
      socket.close(1001, 'Inactivity timeout');
    }, CLIENT_TIMEOUT_MS);

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        socket.close(1001, 'Inactivity timeout');
      }, CLIENT_TIMEOUT_MS);
    };

    socket.on('message', async (raw: RawData) => {
      resetInactivity();
      let data: WsMessage;

      try {
        data = JSON.parse(raw.toString()) as WsMessage;
      } catch {
        data = { type: 'message', text: raw.toString() };
      }

      try {
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (data.type === 'init') {
          const history = (await cacheService.get<WsResponse['history']>(`chat:${userId}`)) ?? [];
          socket.send(JSON.stringify({ userId, response: '', history }));
          return;
        }

        if (data.type === 'clear') {
          const targetId = data.userId ?? userId;
          await cacheService.del(`chat:${targetId}`);
          logger.info({ userId: targetId }, 'Chat history cleared');
          socket.send(JSON.stringify({ userId: targetId, response: '', history: [] }));
          return;
        }

        // Default: AI chat
        const promptText = data.text ?? '';
        logger.debug({ userId, prompt: promptText.slice(0, 50) }, 'AI chat message');
        const { response, history } = await fetchAIResponse(userId, promptText);
        socket.send(JSON.stringify({ userId, response, history }));
      } catch (err) {
        logger.error({ err, userId }, 'WebSocket message handler error');
        socket.send(JSON.stringify({ error: 'Failed to process message' }));
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(inactivityTimer);
      logger.info({ userId }, 'WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId }, 'WebSocket socket error');
    });
  });

  // Server-level heartbeat sweep
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.terminate();
      }
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info('WebSocket gateway initialized');
  return wss;
};

/**
 * Broadcast a message to all connected clients via Redis pub/sub.
 * Safe across multiple horizontally-scaled instances.
 */
export const broadcast = async (data: unknown, targetUserId?: string): Promise<void> => {
  await redisClient.publish('ws:broadcast', JSON.stringify({ targetUserId, data }));
};
