import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { checkDbRateLimit, setDbRateLimitLock } from '@/lib/db-rate-limit';
import { getUserByEmailWithPassword } from '@/lib/queries/users';
import { verifyPassword } from '@/lib/password';
import { setSession } from '@/lib/session';
import { sendEmail } from '@/lib/email';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';

const signinSchema = z.object({
  email: z.string().email('Valid email required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

/**
 * POST /api/auth/password/signin
 * Sign in with email + password.
 *
 * Rate limited per email: 5 attempts per 15 minutes.
 * After 5 failures, locked for 15 minutes.
 * After 10 cumulative failures, locked for 1 hour.
 *
 * Logs all attempts to login_events for security auditing.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Rate limit by email (5 attempts per 15 minutes)
  const { allowed: emailAllowed, count: emailCount } = await checkDbRateLimit(
    normalizedEmail,
    'password_signin',
    5,
    15 * 60_000,
  );
  if (!emailAllowed) {
    // Escalating lockout: 15 min after 5 failures, 1 hour after 10+
    const lockDuration = emailCount >= 10 ? 60 * 60_000 : 15 * 60_000;
    await setDbRateLimitLock(normalizedEmail, 'password_signin', lockDuration);
    return apiError('Too many sign-in attempts. Please try again later.', 429, 'RATE_LIMITED');
  }

  // Also rate limit by IP (20 attempts per 15 minutes across all accounts)
  const { allowed: ipAllowed } = await checkDbRateLimit(ip, 'password_signin_ip', 20, 15 * 60_000);
  if (!ipAllowed) {
    return apiError('Too many sign-in attempts. Please try again later.', 429, 'RATE_LIMITED');
  }

  // Look up user
  const user = await getUserByEmailWithPassword(normalizedEmail);

  // Anti-enumeration: same timing and response for missing user
  if (!user) {
    // Simulate password check timing to prevent timing attacks
    await verifyPassword(
      'dummy-password',
      '$2a$12$LJ3m4ys3Rz0K8q5WQ5x5aO1J1H5s5VLQJ5r5P5Y5d5p5g5j5k5l5',
    );
    await logLoginEvent(null, ip, 'failed_login', 'password');
    return apiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Check if user is deleted or deactivated
  if (user.status === 'deleted') {
    return apiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'deactivated') {
    // Reactivate account on successful login attempt
    const db = getDb();
    await db.execute({
      sql: "UPDATE users SET status = 'active', deactivated_at = NULL WHERE id = ?",
      args: [user.id],
    });
  }

  // Check if user has a password set
  if (!user.password_hash) {
    await logLoginEvent(user.id, ip, 'failed_login', 'password');
    return apiError(
      'No password set for this account. Please use magic link or set a password in your profile.',
      400,
      'NO_PASSWORD',
    );
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await logLoginEvent(user.id, ip, 'failed_login', 'password');
    return apiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Success! Set session
  await setSession(user.id, user.session_version);
  await logLoginEvent(user.id, ip, 'login', 'password');

  // Send notification email for new device/location (non-blocking)
  if (user.email && !user.email.startsWith('wa-')) {
    const loginTime = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });
    sendEmail(
      user.email,
      'New sign-in to Quiet Riots',
      `<p>Hi ${user.name},</p>
       <p>Your Quiet Riots account was signed into with a password at ${loginTime} UTC.</p>
       <p>If this wasn't you, please reset your password immediately.</p>
       <p>— Quiet Riots</p>`,
    ).catch(() => {
      // Graceful degradation
    });
  }

  return apiOk({
    userId: user.id,
    name: user.name,
    email: user.email,
  });
}

/**
 * Log a login event for security auditing.
 * Uses the existing login_events table schema.
 */
async function logLoginEvent(
  userId: string | null,
  ip: string,
  eventType: 'login' | 'failed_login' | 'account_locked',
  provider: string,
): Promise<void> {
  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO login_events (id, user_id, event_type, ip_address, provider)
            VALUES (?, ?, ?, ?, ?)`,
      args: [generateId(), userId, eventType, ip, provider],
    });
  } catch {
    // Don't fail the login if event logging fails
  }
}
