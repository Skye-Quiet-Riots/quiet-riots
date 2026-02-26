import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { getSession } from '@/lib/session';
import { setUserPasswordHash } from '@/lib/queries/users';
import { hashPassword, verifyPassword, isPasswordBreached } from '@/lib/password';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const setPasswordSchema = z.object({
  currentPassword: z.string().optional(), // Required if user already has a password
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

/**
 * POST /api/users/me/password
 * Set or change the current user's password.
 * If user already has a password, current password is required.
 * Bumps session_version to invalidate other sessions.
 */
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not authenticated', 401, 'UNAUTHORIZED');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { currentPassword, newPassword } = parsed.data;

  // Get user with password hash
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, email, password_hash, session_version FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return apiError('User not found', 404, 'NOT_FOUND');
  }

  const user = result.rows[0] as unknown as {
    id: string;
    name: string;
    email: string;
    password_hash: string | null;
    session_version: number;
  };

  // If user already has a password, require current password
  if (user.password_hash) {
    if (!currentPassword) {
      return apiError('Current password is required', 400, 'VALIDATION_ERROR');
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return apiError('Current password is incorrect', 400, 'INVALID_CREDENTIALS');
    }
  }

  // HIBP breach check
  try {
    const breached = await isPasswordBreached(newPassword);
    if (breached) {
      return apiError(
        'This password has appeared in a data breach. Please choose a different one.',
        400,
        'PASSWORD_BREACHED',
      );
    }
  } catch {
    // HIBP API failure — continue (don't block user from setting password)
  }

  // Hash and save
  const hash = await hashPassword(newPassword);
  await setUserPasswordHash(userId, hash);

  // Bump session_version to invalidate other sessions
  const newVersion = user.session_version + 1;
  await db.execute({
    sql: 'UPDATE users SET session_version = ? WHERE id = ?',
    args: [newVersion, userId],
  });

  // Send notification email
  if (user.email && !user.email.startsWith('wa-')) {
    const action = user.password_hash ? 'changed' : 'set';
    sendEmail(
      user.email,
      `Password ${action} on Quiet Riots`,
      `<p>Hi ${user.name},</p>
       <p>Your password was ${action} on your Quiet Riots account.</p>
       <p>If this wasn't you, please reset your password immediately or contact us.</p>
       <p>— Quiet Riots</p>`,
    ).catch(() => {}); // Fire and forget
  }

  return apiOk({
    [user.password_hash ? 'changed' : 'set']: true,
  });
}
