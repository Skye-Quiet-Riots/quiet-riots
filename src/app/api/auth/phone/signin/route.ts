import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { verifyCode } from '@/lib/queries/phone-verification';
import { getUserByPhone, createUser } from '@/lib/queries/users';
import { getDb } from '@/lib/db';
import { setSession } from '@/lib/session';
import { sendEmail } from '@/lib/email';

const signinSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
  code: z.string().length(6, 'Code must be 6 digits'),
  name: z.string().optional(), // For new user creation
  email: z.string().email().optional(), // For new user creation
  language_code: z.string().max(10).optional(),
  country_code: z.string().max(3).optional(),
});

/**
 * POST /api/auth/phone/signin
 * Sign in via phone + OTP code.
 * If user doesn't exist, creates a new account.
 * Sends email notification for SIM swap protection.
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

  const phone = parsed.data.phone.trim();
  const code = parsed.data.code;

  // Verify the code
  const result = await verifyCode(phone, code);
  if (!result) {
    return apiError('Invalid or expired code', 400, 'VALIDATION_ERROR');
  }

  // Find or create user
  let user = await getUserByPhone(phone);
  const isNewUser = !user;

  if (!user) {
    // New user — need at least an email
    if (!parsed.data.email) {
      return apiError('Email is required for new accounts', 400, 'VALIDATION_ERROR');
    }

    // Generate a WhatsApp-style email if none provided
    const email = parsed.data.email;
    const name = parsed.data.name || `User ${phone.slice(-4)}`;

    user = await createUser({
      name,
      email,
      phone,
      language_code: parsed.data.language_code || 'en',
      country_code: parsed.data.country_code,
    });
  }

  // Mark phone as verified
  const db = getDb();
  await db.execute({
    sql: 'UPDATE users SET phone_verified = 1 WHERE id = ?',
    args: [user.id],
  });

  // Set session
  await setSession(user.id);

  // SIM swap protection: send email notification about phone-based signin
  if (!isNewUser && user.email && !user.email.startsWith('wa-')) {
    const loginTime = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });
    await sendEmail(
      user.email,
      'New sign-in to Quiet Riots via phone',
      `<p>Hi ${user.name},</p>
       <p>Your Quiet Riots account was signed into using your phone number at ${loginTime} UTC.</p>
       <p>If this wasn't you, please contact us immediately.</p>
       <p>— Quiet Riots</p>`,
    );
  }

  return apiOk({
    userId: user.id,
    isNewUser,
    name: user.name,
  });
}
