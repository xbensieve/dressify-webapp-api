import pino from 'pino';
import { env } from '@shared/config/env';

const isDevelopment = env.NODE_ENV === 'development';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: structured JSON, ready for log aggregation (Datadog, Loki, etc.)
        formatters: {
          level: (label: string) => ({ level: label }),
          bindings: (bindings: pino.Bindings) => ({
            pid: bindings['pid'],
            host: bindings['hostname'],
          }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

/**
 * Creates a child logger with a request-scoped correlation ID.
 */
export const createRequestLogger = (requestId: string, userId?: string) =>
  logger.child({ requestId, ...(userId ? { userId } : {}) });

export type Logger = typeof logger;
