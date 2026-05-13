import mongoose from 'mongoose';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';

const RETRY_INTERVAL_MS = 5000;
const MAX_RETRIES = 5;

export const connectDB = async (): Promise<void> => {
  let retries = 0;

  const connect = async (): Promise<void> => {
    try {
      await mongoose.connect(env.MONGO_URI, {
        // Connection pool — 10 connections per server
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Replica set ready — these are no-ops for standalone
        readPreference: 'primaryPreferred',
      });

      logger.info('✅ MongoDB connected');

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });
    } catch (error) {
      retries++;
      logger.error({ error, retries, maxRetries: MAX_RETRIES }, 'MongoDB connection failed');

      if (retries >= MAX_RETRIES) {
        logger.fatal('Exceeded max MongoDB connection retries. Shutting down.');
        process.exit(1);
      }

      logger.info(`Retrying MongoDB connection in ${RETRY_INTERVAL_MS}ms...`);
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
      await connect();
    }
  };

  await connect();
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
};
