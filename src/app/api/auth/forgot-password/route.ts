import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { checkDbRateLimit } from '@/lib/db-rate-limit';
import { getUserByEmail } from '@/lib/queries/users';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';
import {
  loadResetEmailStrings,
  renderResetEmail,
  renderResetText,
} from '@/lib/reset-password-email';

const forgotSchema = z.object({
  email: z.string().email('Valid email required').max(255),
  locale: z.string().max(10).optional().default('en'),
});

/**
 * POST /api/auth/forgot-password
 * Send a password reset email.
 *
 * Rate limited: 3 per email per hour.
 * Anti-enumeration: always returns success.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { email, locale } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit per email (3 per hour)
  const { allowed } = await checkDbRateLimit(normalizedEmail, 'forgot_password', 3, 60 * 60_000);
  if (!allowed) {
    return apiError('Too many reset requests. Please try again later.', 429, 'RATE_LIMITED');
  }

  // Look up user — but always return success (anti-enumeration)
  const user = await getUserByEmail(normalizedEmail);

  if (user && user.status !== 'deleted') {
    // Generate reset token
    const token = generateId() + generateId(); // Extra long token
    const expires = new Date(Date.now() + 60 * 60_000); // 1 hour

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO verification_tokens (identifier, token, expires, type)
            VALUES (?, ?, ?, 'password_reset')`,
      args: [normalizedEmail, token, expires.toISOString()],
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quietriots.com';
    const resetUrl = `${baseUrl}/${locale}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send reset email
    const strings = await loadResetEmailStrings(locale);

    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM || 'Quiet Riots <noreply@quietriots.com>';

      if (apiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: normalizedEmail,
            subject: strings.resetEmailSubject,
            html: renderResetEmail(resetUrl, strings),
            text: renderResetText(resetUrl, strings),
          }),
        });
      } else {
        // Dev mode: log the reset URL
        console.log(`[DEV] Password reset URL for ${normalizedEmail}: ${resetUrl}`);
      }
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Don't fail — anti-enumeration
    }
  }

  // Always return success (anti-enumeration)
  return apiOk({ sent: true });
}
