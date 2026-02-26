import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { checkDbRateLimit } from '@/lib/db-rate-limit';
import { getUserByEmail, setUserPasswordHash } from '@/lib/queries/users';
import { validatePassword, hashPassword, isPasswordBreached } from '@/lib/password';
import { getDb } from '@/lib/db';

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

/**
 * POST /api/auth/reset-password
 * Reset password using a token from the forgot-password email.
 *
 * Rate limited: 5 attempts per token per 15 minutes.
 * Validates token, hashes new password, bumps session_version.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { token, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit by token (5 attempts per 15 min)
  const { allowed } = await checkDbRateLimit(token, 'reset_password', 5, 15 * 60_000);
  if (!allowed) {
    return apiError('Too many attempts. Please request a new reset link.', 429, 'RATE_LIMITED');
  }

  // Validate password
  const validation = validatePassword(password);
  if (!validation.valid) {
    return apiError(validation.error!, 400, 'VALIDATION_ERROR');
  }

  // Check HIBP
  const breached = await isPasswordBreached(password);
  if (breached) {
    return apiError(
      'This password has appeared in a data breach. Please choose a different password.',
      400,
      'PASSWORD_BREACHED',
    );
  }

  // Validate token
  const db = getDb();
  const tokenResult = await db.execute({
    sql: `SELECT * FROM verification_tokens
          WHERE identifier = ? AND token = ? AND type = 'password_reset'`,
    args: [normalizedEmail, token],
  });

  if (tokenResult.rows.length === 0) {
    return apiError('Invalid or expired reset link.', 400, 'VALIDATION_ERROR');
  }

  const tokenRow = tokenResult.rows[0] as unknown as { expires: string };
  if (new Date(tokenRow.expires) < new Date()) {
    // Token expired — delete it
    await db.execute({
      sql: "DELETE FROM verification_tokens WHERE identifier = ? AND token = ? AND type = 'password_reset'",
      args: [normalizedEmail, token],
    });
    return apiError(
      'This reset link has expired. Please request a new one.',
      400,
      'VALIDATION_ERROR',
    );
  }

  // Look up user
  const user = await getUserByEmail(normalizedEmail);
  if (!user || user.status === 'deleted') {
    return apiError('Invalid or expired reset link.', 400, 'VALIDATION_ERROR');
  }

  // Hash new password
  const hash = await hashPassword(password);
  await setUserPasswordHash(user.id, hash);

  // Bump session_version to invalidate all existing sessions
  await db.execute({
    sql: 'UPDATE users SET session_version = session_version + 1 WHERE id = ?',
    args: [user.id],
  });

  // Delete the used token
  await db.execute({
    sql: "DELETE FROM verification_tokens WHERE identifier = ? AND token = ? AND type = 'password_reset'",
    args: [normalizedEmail, token],
  });

  // Also delete any other reset tokens for this email
  await db.execute({
    sql: "DELETE FROM verification_tokens WHERE identifier = ? AND type = 'password_reset'",
    args: [normalizedEmail],
  });

  return apiOk({ reset: true });
}
