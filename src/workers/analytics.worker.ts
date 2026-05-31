import { createWorker } from '@infrastructure/queue/bullmq';
import { logger } from '@shared/logger/pino';

interface AnalyticsJobData extends Record<string, unknown> {
  event: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export const startAnalyticsWorker = () => {
  const worker = createWorker<AnalyticsJobData>(
    'analytics',
    async (data, jobName) => {
      // In production, send to data warehouse (BigQuery, ClickHouse, etc.)
      logger.info({ jobName, event: data.event, userId: data.userId }, 'Analytics event processed');
    },
    { concurrency: 10 },
  );

  logger.info('Analytics worker started');
  return worker;
};
