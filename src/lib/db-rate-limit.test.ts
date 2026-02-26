import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { checkDbRateLimit, setDbRateLimitLock, _resetDbRateLimits } from './db-rate-limit';

describe('db-rate-limit', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
  });

  describe('checkDbRateLimit', () => {
    it('allows first request', async () => {
      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    it('allows requests up to the limit', async () => {
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(3);
    });

    it('blocks requests over the limit', async () => {
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('tracks different identifiers independently', async () => {
      await checkDbRateLimit('+447700900001', 'send_code', 1, 60_000);
      const result = await checkDbRateLimit('+447700900002', 'send_code', 1, 60_000);
      expect(result.allowed).toBe(true);
    });

    it('tracks different actions independently', async () => {
      await checkDbRateLimit('+447700900001', 'send_code', 1, 60_000);
      const result = await checkDbRateLimit('+447700900001', 'verify', 1, 60_000);
      expect(result.allowed).toBe(true);
    });

    it('works with email identifiers', async () => {
      await checkDbRateLimit('user@example.com', 'password_login', 3, 60_000);
      await checkDbRateLimit('user@example.com', 'password_login', 3, 60_000);
      await checkDbRateLimit('user@example.com', 'password_login', 3, 60_000);
      const result = await checkDbRateLimit('user@example.com', 'password_login', 3, 60_000);
      expect(result.allowed).toBe(false);
    });

    it('works with IP address identifiers', async () => {
      const result = await checkDbRateLimit('192.168.1.1', 'signup', 5, 300_000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    it('resets after window expires', async () => {
      const { getDb } = await import('@/lib/db');
      const db = getDb();

      // Create a rate limit entry with an old window_start
      await db.execute({
        sql: `INSERT INTO rate_limits (id, identifier, action, count, window_start)
              VALUES ('test-id', ?, ?, 3, ?)`,
        args: ['+447700900001', 'send_code', new Date(Date.now() - 120_000).toISOString()],
      });

      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1); // Reset to 1
    });
  });

  describe('setDbRateLimitLock', () => {
    it('blocks requests during lockout', async () => {
      await setDbRateLimitLock('+447700900001', 'send_code', 60_000);
      const result = await checkDbRateLimit('+447700900001', 'send_code', 10, 60_000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('allows requests after lockout expires', async () => {
      const { getDb } = await import('@/lib/db');
      const db = getDb();

      // Create a lock that already expired
      await db.execute({
        sql: `INSERT INTO rate_limits (id, identifier, action, count, window_start, locked_until)
              VALUES ('lock-id', ?, ?, 0, ?, ?)`,
        args: [
          '+447700900001',
          'send_code',
          new Date().toISOString(),
          new Date(Date.now() - 1000).toISOString(),
        ],
      });

      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('_resetDbRateLimits', () => {
    it('clears all rate limit entries', async () => {
      await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      await _resetDbRateLimits();
      const result = await checkDbRateLimit('+447700900001', 'send_code', 3, 60_000);
      expect(result.count).toBe(1); // Fresh start
    });
  });
});
