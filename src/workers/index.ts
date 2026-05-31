/**
 * Worker process entry point.
 * Run with: npm run worker
 * Can be scaled horizontally as separate containers.
 */
import { connectDB } from '@infrastructure/database/mongoose';
import { connectRedis } from '@infrastructure/cache/redis.client';
import { logger } from '@shared/logger/pino';
import { startEmailWorker } from './email.worker';
import { startImageProcessingWorker } from './imageProcessing.worker';
import { startAnalyticsWorker } from './analytics.worker';
import { startShipmentWorker } from './shipment.worker';

const bootstrap = async () => {
  await Promise.all([connectDB(), connectRedis()]);

  const workers = [
    startEmailWorker(),
    startImageProcessingWorker(),
    startAnalyticsWorker(),
    startShipmentWorker(),
  ];

  logger.info(`🔧 ${workers.length} workers started`);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Worker shutdown signal received');
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Worker bootstrap failed');
  process.exit(1);
});
