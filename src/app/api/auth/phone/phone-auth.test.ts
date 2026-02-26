import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, getDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import {
  createVerificationCode,
  verifyCode,
  getUndeliveredCodes,
  markCodeDelivered,
  cleanExpiredCodes,
} from '@/lib/queries/phone-verification';
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

    it('stores delivery_message in DB for WhatsApp polling', async () => {
      const req = createTestRequest('/api/auth/phone/send-code', {
        method: 'POST',
        body: { phone: '+447700900099' },
      });
      await sendCodePOST(req);

      const db = getDb();
      const result = await db.execute({
        sql: `SELECT delivery_message, delivered_at FROM phone_verification_codes
              WHERE phone = ? ORDER BY created_at DESC LIMIT 1`,
        args: ['+447700900099'],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].delivery_message).toBeTruthy();
      expect((result.rows[0].delivery_message as string)).toContain('Quiet Riots verification code');
      expect(result.rows[0].delivered_at).toBeNull();
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

      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT phone_verified FROM users WHERE id = ?',
        args: ['user-sarah'],
      });
      expect(result.rows[0].phone_verified).toBe(1);
    });
  });

  describe('OTP Delivery Tracking', () => {
    it('createVerificationCode stores delivery_message when provided', async () => {
      const msg = 'Your code is: 123456';
      const { id } = await createVerificationCode('+447700900099', undefined, msg);

      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT delivery_message FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(result.rows[0].delivery_message).toBe(msg);
    });

    it('createVerificationCode stores NULL delivery_message when not provided', async () => {
      const { id } = await createVerificationCode('+447700900099');

      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT delivery_message FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(result.rows[0].delivery_message).toBeNull();
    });

    it('getUndeliveredCodes returns codes awaiting delivery', async () => {
      // Create a code with delivery message
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');

      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(1);
      expect(codes[0].id).toBe(id);
      expect(codes[0].phone).toBe('+447700900099');
      expect(codes[0].delivery_message).toBe('Your code is 123456');
    });

    it('getUndeliveredCodes excludes codes without delivery_message', async () => {
      await createVerificationCode('+447700900099'); // No delivery message
      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(0);
    });

    it('getUndeliveredCodes excludes delivered codes', async () => {
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');
      await markCodeDelivered(id);

      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(0);
    });

    it('getUndeliveredCodes excludes expired codes', async () => {
      // Create code then manually expire it
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');
      const db = getDb();
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
      await db.execute({
        sql: 'UPDATE phone_verification_codes SET expires_at = ? WHERE id = ?',
        args: [pastDate, id],
      });

      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(0);
    });

    it('getUndeliveredCodes excludes verified codes', async () => {
      const { code } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');
      await verifyCode('+447700900099', code);

      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(0);
    });

    it('getUndeliveredCodes returns max 10 codes', async () => {
      // Create 12 codes for different phones
      for (let i = 0; i < 12; i++) {
        const phone = `+44770090${String(i).padStart(4, '0')}`;
        await createVerificationCode(phone, undefined, `Code for ${phone}`);
      }

      const codes = await getUndeliveredCodes();
      expect(codes.length).toBe(10);
    });

    it('markCodeDelivered is atomic (race-safe) — second call returns false', async () => {
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');

      const first = await markCodeDelivered(id);
      const second = await markCodeDelivered(id);

      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('markCodeDelivered sets delivered_at timestamp', async () => {
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');
      await markCodeDelivered(id);

      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT delivered_at FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(result.rows[0].delivered_at).toBeTruthy();
      // Verify it's a valid ISO timestamp
      const deliveredAt = new Date(result.rows[0].delivered_at as string);
      expect(deliveredAt.getTime()).toBeGreaterThan(0);
    });

    it('markCodeDelivered returns false for non-existent id', async () => {
      const result = await markCodeDelivered('non-existent-id');
      expect(result).toBe(false);
    });

    it('verifyCode clears delivery_message (defence in depth)', async () => {
      const { id, code } = await createVerificationCode(
        '+447700900099',
        undefined,
        'Your code is 123456',
      );

      // Verify the delivery message exists first
      const db = getDb();
      const before = await db.execute({
        sql: 'SELECT delivery_message FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(before.rows[0].delivery_message).toBeTruthy();

      // Verify the code
      await verifyCode('+447700900099', code);

      // Delivery message should be NULL now
      const after = await db.execute({
        sql: 'SELECT delivery_message FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(after.rows[0].delivery_message).toBeNull();
    });

    it('cleanExpiredCodes NULLs delivery_message on expired codes before deleting', async () => {
      const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');

      // Manually expire the code
      const db = getDb();
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await db.execute({
        sql: 'UPDATE phone_verification_codes SET expires_at = ? WHERE id = ?',
        args: [pastDate, id],
      });

      await cleanExpiredCodes();

      // Code should be deleted
      const result = await db.execute({
        sql: 'SELECT * FROM phone_verification_codes WHERE id = ?',
        args: [id],
      });
      expect(result.rows.length).toBe(0);
    });

    it('invalidating prior codes also NULLs their delivery_message', async () => {
      // Create first code with delivery message
      const { id: firstId } = await createVerificationCode(
        '+447700900099',
        undefined,
        'First code',
      );

      // Create second code — this should invalidate the first
      await createVerificationCode('+447700900099', undefined, 'Second code');

      // First code's delivery message should be NULL (invalidated)
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT delivery_message, expires_at FROM phone_verification_codes WHERE id = ?',
        args: [firstId],
      });
      expect(result.rows[0].delivery_message).toBeNull();
    });
  });
});
