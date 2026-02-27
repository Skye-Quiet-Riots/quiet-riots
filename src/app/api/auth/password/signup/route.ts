import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { checkDbRateLimit } from '@/lib/db-rate-limit';
import { getUserByEmail, createUser, setUserPasswordHash } from '@/lib/queries/users';
import { hashPassword, validatePassword, isPasswordBreached } from '@/lib/password';
import { setSession } from '@/lib/session';
import { sendEmail } from '@/lib/email';
import { sanitizeText } from '@/lib/sanitize';
import { isValidLocale } from '@/i18n/locales';

const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255)
    .transform((s) => sanitizeText(s)),
  email: z.string().email('Valid email required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
  language_code: z
    .string()
    .max(10)
    .optional()
    .transform((v) => (v && isValidLocale(v) ? v : undefined)),
  country_code: z.string().max(3).optional(),
});

/**
 * POST /api/auth/password/signup
 * Create a new account with email + password.
 * Rate limited: 5 signups per IP per 15 minutes.
 * Checks HIBP for breached passwords.
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed: ipAllowed } = await checkDbRateLimit(ip, 'password_signup', 5, 15 * 60_000);
  if (!ipAllowed) {
    return apiError('Too many signup attempts. Please try again later.', 429, 'RATE_LIMITED');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { name, email, password, language_code, country_code } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.valid) {
    return apiError(validation.error!, 400, 'VALIDATION_ERROR');
  }

  // Check if email already exists
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    // Anti-enumeration: don't reveal whether the email is registered.
    // But if the user has a password, they should sign in instead.
    // If they don't have a password (OAuth/magic-link user), they should link a password on profile.
    // Return generic message in all cases.
    return apiError(
      'An account with this email already exists. Please sign in instead.',
      409,
      'EMAIL_EXISTS',
    );
  }

  // Check HIBP (non-blocking — fails open)
  const breached = await isPasswordBreached(password);
  if (breached) {
    return apiError(
      'This password has appeared in a data breach. Please choose a different password.',
      400,
      'PASSWORD_BREACHED',
    );
  }

  // Create user
  const user = await createUser({
    name,
    email: normalizedEmail,
    language_code: language_code || 'en',
    country_code,
  });

  // Set password hash
  const hash = await hashPassword(password);
  await setUserPasswordHash(user.id, hash);

  // Set session (includes Auth.js JWT for client-side useSession)
  await setSession(user.id, user.session_version, { name: user.name, email: user.email });

  // Send welcome email (non-blocking)
  sendEmail(
    normalizedEmail,
    'Welcome to Quiet Riots',
    `<p>Hi ${name},</p>
     <p>Welcome to Quiet Riots! Your account has been created successfully.</p>
     <p>You can now sign in with your email and password, or use a magic link.</p>
     <p>— Quiet Riots</p>`,
  ).catch(() => {
    // Graceful degradation
  });

  return apiOk({
    userId: user.id,
    name: user.name,
    email: user.email,
  });
}
