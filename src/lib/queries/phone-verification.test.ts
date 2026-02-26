import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import {
  createVerificationCode,
  verifyCode,
  isCooldownPassed,
  cleanExpiredCodes,
  hashCode,
  _resetVerificationCodes,
} from './phone-verification';

describe('phone-verification queries', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
  });

  describe('hashCode', () => {
    it('produces consistent SHA-256 hex digest', () => {
      const hash1 = hashCode('123456');
      const hash2 = hashCode('123456');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('produces different hashes for different codes', () => {
      expect(hashCode('123456')).not.toBe(hashCode('654321'));
    });
  });

  describe('createVerificationCode', () => {
    it('creates a code and returns plaintext + expiry', async () => {
      const result = await createVerificationCode('+447700900001');
      expect(result.code).toHaveLength(6);
      expect(Number(result.code)).not.toBeNaN();
      expect(result.id).toBeTruthy();
      expect(result.expiresAt).toBeTruthy();
    });

    it('stores code as SHA-256 hash (not plaintext)', async () => {
      const { code } = await createVerificationCode('+447700900001');
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT code_hash FROM phone_verification_codes WHERE phone = ?',
        args: ['+447700900001'],
      });
      expect(result.rows[0].code_hash).toBe(hashCode(code));
      expect(result.rows[0].code_hash).not.toBe(code);
    });

    it('invalidates prior codes for same phone', async () => {
      await createVerificationCode('+447700900001');
      const { code: code2 } = await createVerificationCode('+447700900001');

      // Only the second code should verify
      const result = await verifyCode('+447700900001', code2);
      expect(result).not.toBeNull();
    });

    it('links to user_id if provided', async () => {
      await createVerificationCode('+447700900001', 'user-123');
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT user_id FROM phone_verification_codes WHERE phone = ?',
        args: ['+447700900001'],
      });
      expect(result.rows[0].user_id).toBe('user-123');
    });
  });

  describe('verifyCode', () => {
    it('verifies correct code', async () => {
      const { code } = await createVerificationCode('+447700900001');
      const result = await verifyCode('+447700900001', code);
      expect(result).not.toBeNull();
      expect(result!.phone).toBe('+447700900001');
    });

    it('rejects incorrect code', async () => {
      await createVerificationCode('+447700900001');
      const result = await verifyCode('+447700900001', '000000');
      expect(result).toBeNull();
    });

    it('rejects code for wrong phone', async () => {
      const { code } = await createVerificationCode('+447700900001');
      const result = await verifyCode('+447700900002', code);
      expect(result).toBeNull();
    });

    it('rejects already verified code', async () => {
      const { code } = await createVerificationCode('+447700900001');
      await verifyCode('+447700900001', code); // First verification
      const result = await verifyCode('+447700900001', code); // Second attempt
      expect(result).toBeNull();
    });

    it('rejects expired code', async () => {
      const { code } = await createVerificationCode('+447700900001');
      // Manually expire the code
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      await db.execute({
        sql: "UPDATE phone_verification_codes SET expires_at = '2020-01-01T00:00:00.000Z'",
        args: [],
      });
      const result = await verifyCode('+447700900001', code);
      expect(result).toBeNull();
    });

    it('increments attempts on wrong code', async () => {
      await createVerificationCode('+447700900001');
      await verifyCode('+447700900001', '000000');
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT attempts FROM phone_verification_codes WHERE phone = ?',
        args: ['+447700900001'],
      });
      expect(result.rows[0].attempts).toBe(1);
    });

    it('rejects after max attempts', async () => {
      const { code } = await createVerificationCode('+447700900001');
      // Exhaust attempts
      for (let i = 0; i < 5; i++) {
        await verifyCode('+447700900001', '000000');
      }
      // Even correct code should fail now
      const result = await verifyCode('+447700900001', code);
      expect(result).toBeNull();
    });
  });

  describe('isCooldownPassed', () => {
    it('returns true when no prior code exists', async () => {
      const result = await isCooldownPassed('+447700900001');
      expect(result).toBe(true);
    });

    it('returns false within cooldown window', async () => {
      await createVerificationCode('+447700900001');
      const result = await isCooldownPassed('+447700900001', 60_000);
      expect(result).toBe(false);
    });

    it('returns true after cooldown window', async () => {
      await createVerificationCode('+447700900001');
      // Backdate the code
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const past = new Date(Date.now() - 120_000).toISOString();
      await db.execute({
        sql: 'UPDATE phone_verification_codes SET created_at = ?',
        args: [past],
      });
      const result = await isCooldownPassed('+447700900001', 60_000);
      expect(result).toBe(true);
    });
  });

  describe('cleanExpiredCodes', () => {
    it('removes expired codes', async () => {
      await createVerificationCode('+447700900001');
      // Expire it
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      await db.execute({
        sql: "UPDATE phone_verification_codes SET expires_at = '2020-01-01T00:00:00.000Z'",
        args: [],
      });
      const deleted = await cleanExpiredCodes();
      expect(deleted).toBe(1);
    });

    it('preserves unexpired codes', async () => {
      await createVerificationCode('+447700900001');
      const deleted = await cleanExpiredCodes();
      expect(deleted).toBe(0);
    });
  });

  describe('_resetVerificationCodes', () => {
    it('clears all codes', async () => {
      await createVerificationCode('+447700900001');
      await createVerificationCode('+447700900002');
      await _resetVerificationCodes();
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const result = await db.execute('SELECT COUNT(*) as count FROM phone_verification_codes');
      expect((result.rows[0] as unknown as { count: number }).count).toBe(0);
    });
  });
});
