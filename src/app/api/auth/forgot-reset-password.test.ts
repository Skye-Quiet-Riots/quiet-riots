import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, getDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { _resetDbRateLimits } from '@/lib/db-rate-limit';
import { hashPassword } from '@/lib/password';
import { POST as forgotPOST } from './forgot-password/route';
import { POST as resetPOST } from './reset-password/route';

// Mock session
vi.mock('@/lib/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  setSession: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock HIBP
vi.mock('@/lib/password', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/password')>();
  return {
    ...original,
    isPasswordBreached: vi.fn().mockResolvedValue(false),
  };
});

describe('Forgot/Reset Password API', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
    await _resetDbRateLimits();
    vi.clearAllMocks();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns success for known email', async () => {
      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'sarah@example.com' },
      });
      const res = await forgotPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.sent).toBe(true);
    });

    it('returns success for unknown email (anti-enumeration)', async () => {
      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'unknown@test.com' },
      });
      const res = await forgotPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.sent).toBe(true);
    });

    it('creates a verification token for known email', async () => {
      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'sarah@example.com' },
      });
      await forgotPOST(req);

      const db = getDb();
      const tokens = await db.execute({
        sql: "SELECT * FROM verification_tokens WHERE identifier = ? AND type = 'password_reset'",
        args: ['sarah@example.com'],
      });
      expect(tokens.rows.length).toBe(1);
    });

    it('does NOT create a token for unknown email', async () => {
      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'unknown@test.com' },
      });
      await forgotPOST(req);

      const db = getDb();
      const tokens = await db.execute({
        sql: "SELECT * FROM verification_tokens WHERE identifier = ? AND type = 'password_reset'",
        args: ['unknown@test.com'],
      });
      expect(tokens.rows.length).toBe(0);
    });

    it('rate limits to 3 per email per hour', async () => {
      for (let i = 0; i < 3; i++) {
        const req = createTestRequest('/api/auth/forgot-password', {
          method: 'POST',
          body: { email: 'sarah@example.com' },
        });
        const res = await forgotPOST(req);
        const data = await res.json();
        expect(data.ok).toBe(true);
      }

      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'sarah@example.com' },
      });
      const res = await forgotPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(429);
    });

    it('validates email format', async () => {
      const req = createTestRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'not-an-email' },
      });
      const res = await forgotPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    // Helper: create a reset token for testing
    async function createResetToken(email = 'sarah@example.com') {
      const db = getDb();
      const token = 'test-reset-token-12345678';
      const expires = new Date(Date.now() + 60 * 60_000).toISOString();
      await db.execute({
        sql: `INSERT INTO verification_tokens (identifier, token, expires, type)
              VALUES (?, ?, ?, 'password_reset')`,
        args: [email, token, expires],
      });
      return token;
    }

    // Helper: give a user a password for testing
    async function giveUserPassword(userId: string) {
      const db = getDb();
      const hash = await hashPassword('oldPassword123');
      await db.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
        args: [hash, userId],
      });
    }

    it('resets password with valid token', async () => {
      const token = await createResetToken();
      await giveUserPassword('user-sarah');

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.reset).toBe(true);
    });

    it('bumps session_version on reset', async () => {
      const db = getDb();
      const token = await createResetToken();
      await giveUserPassword('user-sarah');

      // Get current version
      const before = await db.execute({
        sql: 'SELECT session_version FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      const versionBefore = before.rows[0].session_version as number;

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      await resetPOST(req);

      const after = await db.execute({
        sql: 'SELECT session_version FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      const versionAfter = after.rows[0].session_version as number;

      expect(versionAfter).toBe(versionBefore + 1);
    });

    it('deletes token after use', async () => {
      const token = await createResetToken();

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      await resetPOST(req);

      const db = getDb();
      const tokens = await db.execute({
        sql: "SELECT * FROM verification_tokens WHERE token = ? AND type = 'password_reset'",
        args: [token],
      });
      expect(tokens.rows.length).toBe(0);
    });

    it('rejects invalid token', async () => {
      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'invalid-token',
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects expired token', async () => {
      const db = getDb();
      const token = 'expired-token';
      const expires = new Date(Date.now() - 1000).toISOString(); // Already expired
      await db.execute({
        sql: `INSERT INTO verification_tokens (identifier, token, expires, type)
              VALUES (?, ?, ?, 'password_reset')`,
        args: ['sarah@example.com', token, expires],
      });

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(data.error).toContain('expired');
    });

    it('rejects short password', async () => {
      const token = await createResetToken();

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'short',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects breached password', async () => {
      const token = await createResetToken();
      const { isPasswordBreached } = await import('@/lib/password');
      (isPasswordBreached as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'breachedPassword123',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(data.code).toBe('PASSWORD_BREACHED');
    });

    it('rate limits per token', async () => {
      const token = await createResetToken();

      for (let i = 0; i < 5; i++) {
        const req = createTestRequest('/api/auth/reset-password', {
          method: 'POST',
          body: {
            token,
            email: 'sarah@example.com',
            password: 'short', // Will fail validation but still counts
          },
        });
        await resetPOST(req);
      }

      const req = createTestRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: 'sarah@example.com',
          password: 'newSecurePassword123',
        },
      });
      const res = await resetPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(429);
    });
  });
});
