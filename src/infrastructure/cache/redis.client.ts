import { createClient, type RedisClientType } from 'redis';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';

let client: RedisClientType;

const createRedisClient = (): RedisClientType => {
  const c = createClient({
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    socket: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          logger.error('Redis: max reconnect attempts reached');
          return new Error('Redis max retries exceeded');
        }
        const delay = Math.min(retries * 500, 5000);
        logger.warn({ retries, delay }, 'Redis reconnecting...');
        return delay;
      },
    },
  }) as RedisClientType;

  c.on('connect', () => logger.info('✅ Redis connected'));
  c.on('ready', () => logger.debug('Redis ready'));
  c.on('error', (err: Error) => logger.error({ err }, 'Redis client error'));
  c.on('end', () => logger.warn('Redis connection closed'));

  return c;
};

export const connectRedis = async (): Promise<void> => {
  if (!client) {
    client = createRedisClient();
  }
  await client.connect();
};

export const disconnectRedis = async (): Promise<void> => {
  if (client?.isOpen) {
    await client.quit();
    logger.info('Redis disconnected gracefully');
  }
};

// Export the client as a typed singleton
export { client as redisClient };
