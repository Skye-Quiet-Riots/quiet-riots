import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { createVerificationCode } from '@/lib/queries/phone-verification';
import { _resetDbRateLimits } from '@/lib/db-rate-limit';
import { POST as sendCodePOST } from './send-code/route';
import { POST as verifyCodePOST } from './verify-code/route';
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

describe('Phone Auth API', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
    await _resetDbRateLimits();
  });

  describe('POST /api/auth/phone/send-code', () => {
    it('returns success for valid phone', async () => {
      const req = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: '+447700900099' },
      });
      const res = await sendCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.sent).toBe(true);
      expect(data.data.expiresInSeconds).toBe(300);
    });

    it('returns success for known phone (anti-enumeration)', async () => {
      // user-sarah has +447700900001
      const req = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: '+447700900001' },
      });
      const res = await sendCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(true); // Same response as unknown phone
    });

    it('rejects invalid phone format', async () => {
      const req = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: 'not-a-phone' },
      });
      const res = await sendCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing phone', async () => {
      const req = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: {},
      });
      const res = await sendCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('rejects invalid JSON', async () => {
      const req = new Request('http://localhost:3000/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const res = await sendCodePOST(req as unknown as import('next/server').NextRequest);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('enforces cooldown between requests', async () => {
      const req1 = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: '+447700900099' },
      });
      await sendCodePOST(req1);

      // Second request within cooldown
      const req2 = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: '+447700900099' },
      });
      const res2 = await sendCodePOST(req2);
      const data2 = await res2.json();
      expect(data2.ok).toBe(false);
      expect(data2.code).toBe('RATE_LIMITED');
    });
  });

  describe('POST /api/auth/phone/verify-code', () => {
    it('verifies correct code', async () => {
      const { code } = await createVerificationCode('+447700900001');
      const req = createTestRequest('/api/auth/phone/verify-code', {
        method: 'POST',
        body: { phone: '+447700900001', code },
      });
      const res = await verifyCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.verified).toBe(true);
      expect(data.data.token).toBeTruthy();
    });

    it('rejects wrong code', async () => {
      await createVerificationCode('+447700900001');
      const req = createTestRequest('/api/auth/phone/verify-code', {
        method: 'POST',
        body: { phone: '+447700900001', code: '000000' },
      });
      const res = await verifyCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('marks phone as verified for existing user', async () => {
      const { code } = await createVerificationCode('+447700900001'); // sarah's phone
      const req = createTestRequest('/api/auth/phone/verify-code', {
        method: 'POST',
        body: { phone: '+447700900001', code },
      });
      await verifyCodePOST(req);

      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT phone_verified FROM users WHERE phone = ?',
        args: ['+447700900001'],
      });
      expect(result.rows[0].phone_verified).toBe(1);
    });

    it('rejects invalid code length', async () => {
      const req = createTestRequest('/api/auth/phone/verify-code', {
        method: 'POST',
        body: { phone: '+447700900001', code: '12' },
      });
      const res = await verifyCodePOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/phone/signin', () => {
    it('signs in existing user with valid code', async () => {
      const { code } = await createVerificationCode('+447700900001'); // sarah's phone
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: { phone: '+447700900001', code },
      });
      const res = await signinPOST(req);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.userId).toBe('user-sarah');
      expect(data.data.isNewUser).toBe(false);
    });

    it('creates new user with email provided', async () => {
      const { code } = await createVerificationCode('+447700900099');
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: {
          phone: '+447700900099',
          code,
          name: 'Test User',
          email: 'test@example.com',
        },
      });
      const res = await signinPOST(req);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.isNewUser).toBe(true);
      expect(data.data.name).toBe('Test User');
    });

    it('requires email for new users', async () => {
      const { code } = await createVerificationCode('+447700900099');
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: { phone: '+447700900099', code },
      });
      const res = await signinPOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('rejects invalid code', async () => {
      await createVerificationCode('+447700900001');
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: { phone: '+447700900001', code: '000000' },
      });
      const res = await signinPOST(req);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('sends SIM swap protection email for existing users', async () => {
      const { sendEmail } = await import('@/lib/email');
      const { code } = await createVerificationCode('+447700900001');
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: { phone: '+447700900001', code },
      });
      await signinPOST(req);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('marks phone as verified on signin', async () => {
      const { code } = await createVerificationCode('+447700900001');
      const req = createTestRequest('/api/auth/phone/signin', {
        method: 'POST',
        body: { phone: '+447700900001', code },
      });
      await signinPOST(req);

      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT phone_verified FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      expect(result.rows[0].phone_verified).toBe(1);
    });
  });
});
