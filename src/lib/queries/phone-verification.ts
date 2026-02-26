/**
 * Phone verification query layer.
 * Handles OTP code generation, storage (SHA-256 hashed), and verification.
 */

import { createHash, randomInt } from 'crypto';
import { getDb } from '../db';
import { generateId } from '@/lib/uuid';

/** Generate a 6-digit OTP code */
export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

/** SHA-256 hash a code for storage */
export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Create a verification code for a phone number.
 * Invalidates all prior unexpired codes for this phone.
 * Returns the plaintext code (for sending via WhatsApp).
 */
export async function createVerificationCode(
  phone: string,
  userId?: string,
): Promise<{ id: string; code: string; expiresAt: string }> {
  const db = getDb();
  const id = generateId();
  const code = generateOtpCode();
  const codeHash = hashCode(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Invalidate prior codes for this phone
  await db.execute({
    sql: `UPDATE phone_verification_codes
          SET expires_at = ?
          WHERE phone = ? AND verified_at IS NULL AND expires_at > ?`,
    args: [now.toISOString(), phone, now.toISOString()],
  });

  // Insert new code
  await db.execute({
    sql: `INSERT INTO phone_verification_codes (id, phone, user_id, code_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, phone, userId ?? null, codeHash, expiresAt, now.toISOString()],
  });

  return { id, code, expiresAt };
}

/**
 * Verify an OTP code for a phone number.
 * Returns the verification record if successful, null if failed.
 * Increments attempt count on failure.
 */
export async function verifyCode(
  phone: string,
  code: string,
): Promise<{ id: string; phone: string; userId: string | null } | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const codeHash = hashCode(code);

  // Find the latest unexpired, unverified code for this phone
  const result = await db.execute({
    sql: `SELECT id, phone, user_id, code_hash, attempts, max_attempts
          FROM phone_verification_codes
          WHERE phone = ? AND verified_at IS NULL AND expires_at > ?
          ORDER BY created_at DESC LIMIT 1`,
    args: [phone, now],
  });

  if (result.rows.length === 0) {
    return null; // No valid code found (expired or doesn't exist)
  }

  const row = result.rows[0];
  const id = row.id as string;
  const storedHash = row.code_hash as string;
  const attempts = row.attempts as number;
  const maxAttempts = row.max_attempts as number;

  // Check if max attempts exceeded
  if (attempts >= maxAttempts) {
    return null;
  }

  // Check code
  if (codeHash !== storedHash) {
    // Increment attempts
    await db.execute({
      sql: 'UPDATE phone_verification_codes SET attempts = attempts + 1 WHERE id = ?',
      args: [id],
    });
    return null;
  }

  // Mark as verified
  await db.execute({
    sql: 'UPDATE phone_verification_codes SET verified_at = ? WHERE id = ?',
    args: [now, id],
  });

  return {
    id,
    phone: row.phone as string,
    userId: row.user_id as string | null,
  };
}

/**
 * Get the most recent code creation time for a phone (for cooldown check).
 * Returns null if no recent code exists.
 */
export async function getLastCodeCreatedAt(phone: string): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT created_at FROM phone_verification_codes
          WHERE phone = ? ORDER BY created_at DESC LIMIT 1`,
    args: [phone],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0].created_at as string;
}

/**
 * Check if a cooldown period has passed since the last code was sent.
 * Returns true if sending is allowed (cooldown has passed).
 */
export async function isCooldownPassed(phone: string, cooldownMs = 60_000): Promise<boolean> {
  const lastCreated = await getLastCodeCreatedAt(phone);
  if (!lastCreated) return true;

  const elapsed = Date.now() - new Date(lastCreated).getTime();
  return elapsed >= cooldownMs;
}

/** Clean up expired verification codes (housekeeping). */
export async function cleanExpiredCodes(): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `DELETE FROM phone_verification_codes WHERE expires_at < ?`,
    args: [new Date().toISOString()],
  });
  return result.rowsAffected;
}

/** Clear all verification codes (test helper). */
export async function _resetVerificationCodes(): Promise<void> {
  const db = getDb();
  await db.execute('DELETE FROM phone_verification_codes');
}
