/**
 * Password hashing and validation utilities.
 *
 * Uses bcryptjs (pure JS, serverless-compatible) with 12 salt rounds.
 * Passwords are pre-hashed with SHA-256 before bcrypt to support passwords
 * longer than bcrypt's 72-byte input limit.
 *
 * Password policy follows NIST SP 800-63B:
 * - Minimum 10 characters
 * - No arbitrary composition rules (letter + number etc.)
 * - Checked against HIBP breached password database
 */

import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const SALT_ROUNDS = 12;
const MIN_LENGTH = 10;
const MAX_LENGTH = 128;

/**
 * Pre-hash password with SHA-256 before bcrypt.
 * This avoids bcrypt's 72-byte truncation issue while maintaining security.
 */
function preHash(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Validate password meets minimum requirements.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters` };
  }
  if (password.length > MAX_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_LENGTH} characters` };
  }
  return { valid: true };
}

/**
 * Hash a password for storage.
 * Uses SHA-256 pre-hash + bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const preHashed = preHash(password);
  return bcrypt.hash(preHashed, SALT_ROUNDS);
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const preHashed = preHash(password);
  return bcrypt.compare(preHashed, hash);
}

/**
 * Check if a password has been exposed in data breaches using the
 * Have I Been Pwned API with k-anonymity (only first 5 chars of SHA-1 sent).
 *
 * Returns true if the password is BREACHED (should be rejected).
 * Returns false if the password is safe or the API is unreachable.
 * Never blocks signup if the API is down — fails open.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'QuietRiots-PasswordCheck' },
      signal: AbortSignal.timeout(3000), // 3s timeout — don't block signup
    });

    if (!response.ok) return false; // Fail open

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password found in breach database
      }
    }

    return false;
  } catch {
    // Network error, timeout, etc. — fail open
    return false;
  }
}
