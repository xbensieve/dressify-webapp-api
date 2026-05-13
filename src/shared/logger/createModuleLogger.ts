import { logger } from './pino';

/**
 * Creates a child logger pre-tagged with a module label.
 *
 * Every log line emitted from a child logger carries a `module` field,
 * making it trivially filterable in GCP Cloud Logging:
 *
 *   jsonPayload.module="auth.service" AND severity="ERROR"
 *
 * This enables fine-grained log-based alert policies per module.
 *
 * @example
 *   const log = createModuleLogger('auth.service');
 *   log.info({ userId }, 'User registered');
 *   log.error({ err, email }, 'Registration failed');
 */
export const createModuleLogger = (module: string) =>
  logger.child({ module });
