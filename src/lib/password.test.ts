import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePassword, hashPassword, verifyPassword, isPasswordBreached } from './password';

describe('password utilities', () => {
  describe('validatePassword', () => {
    it('rejects empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('rejects password shorter than 10 characters', () => {
      expect(validatePassword('short123').valid).toBe(false);
      expect(validatePassword('123456789').valid).toBe(false);
    });

    it('accepts password with exactly 10 characters', () => {
      expect(validatePassword('abcdefghij').valid).toBe(true);
    });

    it('accepts long passwords', () => {
      expect(validatePassword('a'.repeat(100)).valid).toBe(true);
    });

    it('rejects passwords over 128 characters', () => {
      const result = validatePassword('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 128');
    });

    it('accepts passwords without composition rules (NIST compliant)', () => {
      // No letter+number requirement — pure alphabetical is fine
      expect(validatePassword('abcdefghijklmnop').valid).toBe(true);
      // All numbers is fine
      expect(validatePassword('1234567890').valid).toBe(true);
      // Spaces are fine
      expect(validatePassword('my passphrase here').valid).toBe(true);
    });
  });

  describe('hashPassword + verifyPassword', () => {
    it('round-trip: hash then verify succeeds', async () => {
      const password = 'mysecurepassword123';
      const hash = await hashPassword(password);
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('wrong password fails verification', async () => {
      const hash = await hashPassword('correctpassword');
      expect(await verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('different hashes for same password (salt)', async () => {
      const password = 'samepassword1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // Different salts
      // But both verify
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('handles passwords longer than 72 bytes (pre-hash prevents truncation)', async () => {
      const longPassword = 'a'.repeat(100);
      const slightlyDifferent = 'a'.repeat(100) + 'b';
      const hash = await hashPassword(longPassword);
      // Without pre-hash, bcrypt would truncate both to 72 bytes and they'd match
      // With pre-hash, they produce different SHA-256 digests
      expect(await verifyPassword(longPassword, hash)).toBe(true);
      expect(await verifyPassword(slightlyDifferent, hash)).toBe(false);
    });

    it('hash output is a bcrypt string', async () => {
      const hash = await hashPassword('testpassword');
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });
  });

  describe('isPasswordBreached', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns true for known breached password (mocked)', async () => {
      // SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\nOTHERHASH:123\r\n', {
          status: 200,
        }),
      );

      const result = await isPasswordBreached('password');
      expect(result).toBe(true);
    });

    it('returns false for safe password (mocked)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('OTHERHASH1:5\r\nOTHERHASH2:10\r\n', { status: 200 }),
      );

      const result = await isPasswordBreached('my-very-unique-password-xyz-2026');
      expect(result).toBe(false);
    });

    it('fails open on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const result = await isPasswordBreached('anypassword');
      expect(result).toBe(false); // Fails open — allows signup
    });

    it('fails open on non-200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }));
      const result = await isPasswordBreached('anypassword');
      expect(result).toBe(false);
    });
  });
});
