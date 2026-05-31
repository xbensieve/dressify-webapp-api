import { createServer } from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from '@infrastructure/database/mongoose';
import { connectRedis, disconnectRedis } from '@infrastructure/cache/redis.client';
import { initWebSocketGateway } from '@infrastructure/websocket/ws.gateway';
import { closeAllQueues } from '@infrastructure/queue/bullmq';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';

const bootstrap = async () => {
  // Connect infrastructure
  await Promise.all([connectDB(), connectRedis()]);

  const app = createApp();
  const httpServer = createServer(app);

  // WebSocket gateway
  initWebSocketGateway(httpServer);

  // ── Listen with EADDRINUSE handling ──────────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          `❌ Port ${env.PORT} is already in use.\n` +
          `   Run: netstat -ano | findstr :${env.PORT}  →  taskkill /PID <pid> /F\n` +
          `   Or change PORT in your .env file.`,
        );
        process.exit(1);
      }
      reject(err);
    });

    httpServer.listen(env.PORT, () => {
      logger.info(`HTTP server started at http://localhost:${env.PORT}`);
      logger.info(`WebSocket server running at ws://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      resolve();
    });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    httpServer.close(async () => {
      logger.info('HTTP server closed');
      try {
        await Promise.all([disconnectDB(), disconnectRedis(), closeAllQueues()]);
        logger.info('All connections closed gracefully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force shutdown after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Unhandled rejections — log but don't crash in dev
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
    // EADDRINUSE is already handled above; avoid double-logging
    if (err.code !== 'EADDRINUSE') {
      logger.fatal({ err }, 'Uncaught exception — shutting down');
      process.exit(1);
    }
  });
};

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap server');
  process.exit(1);
});
