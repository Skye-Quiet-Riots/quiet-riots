import { describe, it, expect } from 'vitest';
import { logger, createRequestLogger } from './logger';

describe('logger', () => {
  it('exports a pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('creates a child logger with request context', () => {
    const requestLog = createRequestLogger({
      requestId: 'test-req-123',
      action: 'search_issues',
      userId: 'user-1',
      ip: '127.0.0.1',
    });
    expect(requestLog).toBeDefined();
    expect(typeof requestLog.info).toBe('function');
    expect(typeof requestLog.error).toBe('function');
  });

  it('creates a child logger with partial context', () => {
    const requestLog = createRequestLogger({ action: 'get_trending' });
    expect(requestLog).toBeDefined();
    expect(typeof requestLog.info).toBe('function');
  });
});
