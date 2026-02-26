import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, getDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { _resetDbRateLimits } from '@/lib/db-rate-limit';
import { POST, DELETE } from './route';

// Mock session
const mockSession = vi.fn().mockResolvedValue('user-sarah');
vi.mock('@/lib/session', () => ({
  getSession: () => mockSession(),
  setSession: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock phone verification - always succeed for verify
const mockVerifyCode = vi.fn();
const mockCreateVerificationCode = vi.fn().mockResolvedValue({
  id: 'code-1',
  code: '123456',
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
});
const mockIsCooldownPassed = vi.fn().mockResolvedValue(true);

vi.mock('@/lib/queries/phone-verification', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/queries/phone-verification')>();
  return {
    ...original,
    verifyCode: (...args: Parameters<typeof original.verifyCode>) => mockVerifyCode(...args),
    createVerificationCode: (...args: Parameters<typeof original.createVerificationCode>) =>
      mockCreateVerificationCode(...args),
    isCooldownPassed: (...args: Parameters<typeof original.isCooldownPassed>) =>
      mockIsCooldownPassed(...args),
  };
});

describe('Phone Management API', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
    await _resetDbRateLimits();
    vi.clearAllMocks();
    mockSession.mockResolvedValue('user-sarah');
    mockVerifyCode.mockResolvedValue({
      id: 'code-1',
      phone: '+447700900099',
      userId: 'user-sarah',
    });
    mockCreateVerificationCode.mockResolvedValue({
      id: 'code-1',
      code: '123456',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });
    mockIsCooldownPassed.mockResolvedValue(true);
  });

  describe('POST /api/users/me/phone (send_code)', () => {
    it('sends verification code for new phone', async () => {
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447700900099' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.sent).toBe(true);
      expect(mockCreateVerificationCode).toHaveBeenCalledWith('+447700900099', 'user-sarah');
    });

    it('rejects unauthenticated request', async () => {
      mockSession.mockResolvedValue(null);
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447700900099' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('rejects invalid phone format', async () => {
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: 'not-a-phone' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects phone already linked to another user', async () => {
      // user-admin has +447974766838 in seed data
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447974766838' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it('respects cooldown', async () => {
      mockIsCooldownPassed.mockResolvedValue(false);
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447700900099' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/users/me/phone (verify)', () => {
    it('links phone on successful verification', async () => {
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'verify', phone: '+447700900099', code: '123456' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.linked).toBe(true);
      expect(data.data.phone).toBe('+447700900099');

      // Verify DB updated
      const db = getDb();
      const user = await db.execute({
        sql: 'SELECT phone, phone_verified FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      expect(user.rows[0].phone).toBe('+447700900099');
      expect(user.rows[0].phone_verified).toBe(1);
    });

    it('rejects invalid code', async () => {
      mockVerifyCode.mockResolvedValue(null);
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'verify', phone: '+447700900099', code: '000000' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('sends notification email on phone link', async () => {
      // Remove sarah's existing phone so this is a "linked" action, not "changed"
      const db = getDb();
      await db.execute({
        sql: 'UPDATE users SET phone = NULL, phone_verified = 0 WHERE id = ?',
        args: ['user-sarah'],
      });

      const { sendEmail } = await import('@/lib/email');
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'verify', phone: '+447700900099', code: '123456' },
      });
      await POST(req);

      // Give the async email a tick to fire
      await new Promise((r) => setTimeout(r, 10));
      expect(sendEmail).toHaveBeenCalledWith(
        'sarah@example.com',
        expect.stringContaining('linked'),
        expect.stringContaining('+447700900099'),
      );
    });

    it('requires step-up auth when changing verified phone', async () => {
      // Give sarah a verified phone
      const db = getDb();
      await db.execute({
        sql: "UPDATE users SET phone = '+441111111111', phone_verified = 1 WHERE id = ?",
        args: ['user-sarah'],
      });

      // No recent login → should fail
      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447700900099' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    it('allows phone change with recent login', async () => {
      const db = getDb();
      // Give sarah a verified phone
      await db.execute({
        sql: "UPDATE users SET phone = '+441111111111', phone_verified = 1 WHERE id = ?",
        args: ['user-sarah'],
      });

      // Create a recent login event
      await db.execute({
        sql: `INSERT INTO login_events (id, user_id, event_type, provider, created_at)
              VALUES (?, ?, 'login', 'password', ?)`,
        args: ['event-1', 'user-sarah', new Date().toISOString()],
      });

      const req = createTestRequest('/api/users/me/phone', {
        method: 'POST',
        body: { action: 'send_code', phone: '+447700900099' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
    });
  });

  describe('DELETE /api/users/me/phone', () => {
    it('unlinks phone when user has other auth methods', async () => {
      // Give sarah a phone + an OAuth account (seed data has accounts for sarah)
      const db = getDb();
      await db.execute({
        sql: "UPDATE users SET phone = '+447700900001', phone_verified = 1 WHERE id = ?",
        args: ['user-sarah'],
      });
      // Add an OAuth account so sarah has 2 methods
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id)
              VALUES ('acc-1', 'user-sarah', 'oauth', 'google', 'google-123')`,
        args: [],
      });

      const req = createTestRequest('/api/users/me/phone', { method: 'DELETE' });
      const res = await DELETE(req);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data.unlinked).toBe(true);

      // Verify DB updated
      const user = await db.execute({
        sql: 'SELECT phone, phone_verified FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      expect(user.rows[0].phone).toBeNull();
      expect(user.rows[0].phone_verified).toBe(0);
    });

    it('rejects if phone is the only auth method', async () => {
      const db = getDb();
      await db.execute({
        sql: "UPDATE users SET phone = '+447700900001', phone_verified = 1 WHERE id = ?",
        args: ['user-sarah'],
      });
      // No OAuth accounts, no password

      const req = createTestRequest('/api/users/me/phone', { method: 'DELETE' });
      const res = await DELETE(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(data.error).toContain('only authentication method');
    });

    it('rejects if no phone linked', async () => {
      // Sarah has no phone in seed data (or null)
      const db = getDb();
      await db.execute({
        sql: 'UPDATE users SET phone = NULL, phone_verified = 0 WHERE id = ?',
        args: ['user-sarah'],
      });

      const req = createTestRequest('/api/users/me/phone', { method: 'DELETE' });
      const res = await DELETE(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated request', async () => {
      mockSession.mockResolvedValue(null);
      const req = createTestRequest('/api/users/me/phone', { method: 'DELETE' });
      const res = await DELETE(req);
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(res.status).toBe(401);
    });
  });
});
