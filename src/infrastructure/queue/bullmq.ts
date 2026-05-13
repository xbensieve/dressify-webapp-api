import { Queue, Worker, type JobsOptions, type WorkerOptions } from 'bullmq';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';

// Use env vars directly for BullMQ connection
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
};

export type QueueName = 'email' | 'notifications' | 'image-processing' | 'analytics';

const queues = new Map<QueueName, Queue>();

/**
 * Get or create a named BullMQ queue.
 */
export const getQueue = (name: QueueName): Queue => {
  if (!queues.has(name)) {
    const q = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 }, // Dead-letter retention
      },
    });
    queues.set(name, q);
    logger.debug({ queue: name }, 'BullMQ queue initialized');
  }
  return queues.get(name)!;
};

/**
 * Enqueue a job to a named queue.
 */
export const enqueue = async <T extends Record<string, unknown>>(
  queueName: QueueName,
  jobName: string,
  data: T,
  opts?: JobsOptions,
): Promise<void> => {
  const queue = getQueue(queueName);
  await queue.add(jobName, data, opts);
  logger.debug({ queue: queueName, job: jobName }, 'Job enqueued');
};

/**
 * Create a typed BullMQ worker for a named queue.
 */
export const createWorker = <T extends Record<string, unknown>>(
  name: QueueName,
  processor: (data: T, jobName: string) => Promise<void>,
  opts?: Partial<WorkerOptions>,
): Worker => {
  const worker = new Worker(
    name,
    async (job) => {
      logger.debug({ queue: name, job: job.name, id: job.id }, 'Processing job');
      await processor(job.data as T, job.name);
    },
    {
      connection,
      concurrency: 5,
      ...opts,
    },
  );

  worker.on('completed', (job) => {
    logger.debug({ queue: name, job: job.name, id: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ queue: name, job: job?.name, id: job?.id, err }, 'Job failed');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ queue: name, jobId }, 'Job stalled');
  });

  return worker;
};

/**
 * Gracefully close all queues.
 */
export const closeAllQueues = async (): Promise<void> => {
  await Promise.all([...queues.values()].map((q) => q.close()));
  logger.info('All BullMQ queues closed');
};
