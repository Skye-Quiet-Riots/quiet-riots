import pino from 'pino';

/**
 * Structured JSON logger using pino.
 *
 * In production (Vercel), pino outputs JSON to stdout which Vercel captures automatically.
 * In development, logs are human-readable via pino's default pretty printing.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ action: 'search_issues', query }, 'Bot search');
 *   logger.error({ err, userId }, 'Failed to join issue');
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    },
  }),
});

/**
 * Create a child logger with request context.
 * Use this at the start of API route handlers for per-request logging.
 */
export function createRequestLogger(context: {
  requestId?: string;
  action?: string;
  userId?: string;
  ip?: string;
}) {
  return logger.child(context);
}
