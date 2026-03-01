import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { _resetDbRateLimits } from '@/lib/db-rate-limit';
import { POST as signupPOST } from './signup/route';
import { POST as signinPOST } from './signin/route';

// Mock session (cookies() is server-only)
vi.mock('@/lib/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  setSession: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock HIBP — always return safe password (except for specific test)
vi.mock('@/lib/password', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/password')>();
  return {
    ...original,
    isPasswordBreached: vi.fn().mockResolvedValue(false),
  };
});

describe('Password Auth API', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
    await _resetDbRateLimits();
    vi.clearAllMocks();
  });

  describe('POST /api/auth/password/signup', () => {
    it('creates a new user with email and password', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'newuser@test.com',
          password: 'securePassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.name).toBe('Test User');
      expect(data.data.email).toBe('newuser@test.com');
      expect(data.data.userId).toBeDefined();
    });

    it('rejects duplicate email', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'sarah@example.com', // Already exists in seed data
          password: 'securePassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(409);
      expect(data.code).toBe('EMAIL_EXISTS');
    });

    it('rejects password shorter than 10 characters', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'newuser@test.com',
          password: 'short',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(data.error).toContain('10 characters');
    });

    it('rejects breached password', async () => {
      const { isPasswordBreached } = await import('@/lib/password');
      (isPasswordBreached as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'newuser@test.com',
          password: 'breachedPassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(data.code).toBe('PASSWORD_BREACHED');
    });

    it('validates required fields', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: { email: 'test@test.com' }, // Missing name and password
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('normalises email to lowercase', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'TestUser@Test.com',
          password: 'securePassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.email).toBe('testuser@test.com');
    });

    it('rate limits signups by IP', { timeout: 30_000 }, async () => {
      // 5 signups should succeed
      for (let i = 0; i < 5; i++) {
        const req = createTestRequest('/api/auth/password/signup', {
          method: 'POST',
          body: {
            name: `User ${i}`,
            email: `user${i}@test.com`,
            password: 'securePassword123',
          },
        });
        const res = await signupPOST(req);
        const data = await res.json();
        expect(data.ok).toBe(true);
      }

      // 6th should be rate limited
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'User 5',
          email: 'user5@test.com',
          password: 'securePassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('sanitises control characters from name', async () => {
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test\x00User\x1F',
          email: 'safe@test.com',
          password: 'securePassword123',
        },
      });
      const res = await signupPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.name).toBe('TestUser');
    });

    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost:3000/api/auth/password/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      });
      const res = await signupPOST(req as unknown as import('next/server').NextRequest);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('sets session after successful signup', async () => {
      const { setSession } = await import('@/lib/session');
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'session@test.com',
          password: 'securePassword123',
        },
      });
      await signupPOST(req);

      expect(setSession).toHaveBeenCalledOnce();
      expect(setSession).toHaveBeenCalledWith(expect.any(String), expect.any(Number), {
        name: 'Test User',
        email: 'session@test.com',
      });
    });

    it('sends welcome email after signup', async () => {
      const { sendEmail } = await import('@/lib/email');
      const req = createTestRequest('/api/auth/password/signup', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'welcome@test.com',
          password: 'securePassword123',
        },
      });
      await signupPOST(req);

      // Give the async email a tick to fire
      await new Promise((r) => setTimeout(r, 10));
      expect(sendEmail).toHaveBeenCalledWith(
        'welcome@test.com',
        'Welcome to Quiet Riots',
        expect.stringContaining('Welcome'),
      );
    });
  });

  describe('POST /api/auth/password/signin', () => {
    // Helper: create a user with a password for signin tests
    async function createUserWithPassword(email = 'test@test.com', password = 'securePassword123') {
      const { getDb } = await import('@/lib/db');
      const { hashPassword: realHashPassword } = await import('@/lib/password');
      const db = getDb();
      const hash = await realHashPassword(password);
      await db.execute({
        sql: `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
        args: ['user-test-pw', 'Test PW User', email, hash],
      });
      return 'user-test-pw';
    }

    it('signs in with correct email and password', async () => {
      await createUserWithPassword();
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'securePassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.userId).toBe('user-test-pw');
      expect(data.data.name).toBe('Test PW User');
    });

    it('rejects wrong password', async () => {
      await createUserWithPassword();
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'wrongPassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(401);
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects unknown email with same error', async () => {
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'unknown@test.com', password: 'anyPassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(401);
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects user with no password set', async () => {
      // sarah@example.com has no password_hash in seed data
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'sarah@example.com', password: 'anyPassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(data.code).toBe('NO_PASSWORD');
    });

    it('normalises email to lowercase', async () => {
      await createUserWithPassword();
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'TEST@TEST.COM', password: 'securePassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.userId).toBe('user-test-pw');
    });

    it('rate limits after 5 failed attempts per email', { timeout: 30_000 }, async () => {
      await createUserWithPassword();

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const req = createTestRequest('/api/auth/password/signin', {
          method: 'POST',
          body: { email: 'test@test.com', password: 'wrong' },
        });
        await signinPOST(req);
      }

      // 6th attempt should be rate limited (even with correct password)
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'securePassword123' },
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('sets session after successful signin', async () => {
      const { setSession } = await import('@/lib/session');
      await createUserWithPassword();

      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'securePassword123' },
      });
      await signinPOST(req);

      expect(setSession).toHaveBeenCalledWith('user-test-pw', expect.any(Number), {
        name: 'Test PW User',
        email: 'test@test.com',
      });
    });

    it('logs successful login event', async () => {
      const { getDb } = await import('@/lib/db');
      await createUserWithPassword();

      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'securePassword123' },
      });
      await signinPOST(req);

      const db = getDb();
      const events = await db.execute({
        sql: "SELECT * FROM login_events WHERE user_id = ? AND event_type = 'login'",
        args: ['user-test-pw'],
      });
      expect(events.rows.length).toBe(1);
      expect(events.rows[0].provider).toBe('password');
    });

    it('logs failed login event', async () => {
      const { getDb } = await import('@/lib/db');
      await createUserWithPassword();

      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'wrongPassword123' },
      });
      await signinPOST(req);

      const db = getDb();
      const events = await db.execute({
        sql: "SELECT * FROM login_events WHERE user_id = ? AND event_type = 'failed_login'",
        args: ['user-test-pw'],
      });
      expect(events.rows.length).toBe(1);
    });

    it('validates required fields', async () => {
      const req = createTestRequest('/api/auth/password/signin', {
        method: 'POST',
        body: { email: 'test@test.com' }, // Missing password
      });
      const res = await signinPOST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost:3000/api/auth/password/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      });
      const res = await signinPOST(req as unknown as import('next/server').NextRequest);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });
  });
});
