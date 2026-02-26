import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { getSession } from '@/lib/session';
import { getUserById, countUserAuthMethods } from '@/lib/queries/users';
import {
  verifyCode,
  createVerificationCode,
  isCooldownPassed,
} from '@/lib/queries/phone-verification';
import { checkDbRateLimit, setDbRateLimitLock } from '@/lib/db-rate-limit';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const sendCodeSchema = z.object({
  action: z.literal('send_code'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
});

const verifyCodeSchema = z.object({
  action: z.literal('verify'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

const phoneActionSchema = z.discriminatedUnion('action', [sendCodeSchema, verifyCodeSchema]);

/**
 * POST /api/users/me/phone
 * Link or change phone number on the current user's account.
 * Two-step: first send_code, then verify.
 *
 * Security: If user already has a verified phone (changing it),
 * we check that they logged in within the last 5 minutes (step-up auth).
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

  const parsed = phoneActionSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 404, 'NOT_FOUND');
  }

  const phone = parsed.data.phone.trim();

  // Step-up auth: if changing a verified phone, require recent login (5 min)
  if (user.phone_verified && user.phone && user.phone !== phone) {
    const db = getDb();
    const loginCheck = await db.execute({
      sql: `SELECT created_at FROM login_events
            WHERE user_id = ? AND event_type = 'login'
            ORDER BY created_at DESC LIMIT 1`,
      args: [userId],
    });

    if (loginCheck.rows.length === 0) {
      return apiError(
        'Please sign in again before changing your phone number',
        403,
        'UNAUTHORIZED',
      );
    }

    const lastLogin = new Date(loginCheck.rows[0].created_at as string).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - lastLogin > fiveMinutes) {
      return apiError(
        'Please sign in again before changing your phone number',
        403,
        'UNAUTHORIZED',
      );
    }
  }

  // Check that this phone isn't already linked to another user
  const db = getDb();
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE phone = ? AND id != ?',
    args: [phone, userId],
  });
  if (existingUser.rows.length > 0) {
    return apiError(
      'This phone number is already linked to another account',
      409,
      'VALIDATION_ERROR',
    );
  }

  if (parsed.data.action === 'send_code') {
    // Rate limit: 3 codes per 5 minutes per phone
    const rateCheck = await checkDbRateLimit(phone, 'link_phone', 3, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      if (rateCheck.count >= 6) {
        await setDbRateLimitLock(phone, 'link_phone', 60 * 60 * 1000);
      } else if (rateCheck.count >= 4) {
        await setDbRateLimitLock(phone, 'link_phone', 15 * 60 * 1000);
      }
      return apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    // 60-second cooldown
    const cooldownOk = await isCooldownPassed(phone, 60_000);
    if (!cooldownOk) {
      return apiError('Please wait before requesting another code.', 429, 'RATE_LIMITED');
    }

    // Create and send code
    const { code } = await createVerificationCode(phone, userId);

    if (process.env.NODE_ENV === 'production') {
      try {
        const botUrl = 'https://www.quietriots.com/api/bot';
        const botKey = process.env.BOT_API_KEY;
        if (botKey) {
          await fetch(botUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${botKey}`,
            },
            body: JSON.stringify({
              action: 'send_whatsapp_message',
              params: {
                phone,
                message: `Your Quiet Riots verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
              },
            }),
          });
        }
      } catch {
        console.error('Failed to send WhatsApp verification code');
      }
    } else {
      console.log(`[DEV] Phone link verification code for ${phone}: ${code}`);
    }

    return apiOk({ sent: true, expiresInSeconds: 300 });
  }

  // action === 'verify'
  const verifyData = parsed.data as z.infer<typeof verifyCodeSchema>;
  const result = await verifyCode(phone, verifyData.code);
  if (!result) {
    return apiError('Invalid or expired code', 400, 'VALIDATION_ERROR');
  }

  // Update user's phone and mark as verified
  const oldPhone = user.phone;
  await db.execute({
    sql: 'UPDATE users SET phone = ?, phone_verified = 1 WHERE id = ?',
    args: [phone, userId],
  });

  // Send notification email about phone change (if user has a real email)
  if (user.email && !user.email.startsWith('wa-')) {
    const action = oldPhone ? 'changed' : 'linked';
    sendEmail(
      user.email,
      `Phone number ${action} on Quiet Riots`,
      `<p>Hi ${user.name},</p>
       <p>A phone number was ${action} on your Quiet Riots account: ${phone}</p>
       <p>If this wasn't you, please contact us immediately.</p>
       <p>— Quiet Riots</p>`,
    ).catch(() => {}); // Fire and forget
  }

  return apiOk({ linked: true, phone });
}

/**
 * DELETE /api/users/me/phone
 * Unlink phone from the current user's account.
 * Requires at least one other auth method to remain.
 */
export async function DELETE() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not authenticated', 401, 'UNAUTHORIZED');
  }

  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 404, 'NOT_FOUND');
  }

  if (!user.phone) {
    return apiError('No phone number to unlink', 400, 'VALIDATION_ERROR');
  }

  // Check auth method count — must have at least 2 (one to remove, one to keep)
  const methodCount = await countUserAuthMethods(userId);
  if (methodCount <= 1) {
    return apiError(
      'Cannot unlink your only authentication method. Add a password or link an account first.',
      400,
      'VALIDATION_ERROR',
    );
  }

  const db = getDb();
  await db.execute({
    sql: 'UPDATE users SET phone = NULL, phone_verified = 0 WHERE id = ?',
    args: [userId],
  });

  // Send notification email
  if (user.email && !user.email.startsWith('wa-')) {
    sendEmail(
      user.email,
      'Phone number removed from Quiet Riots',
      `<p>Hi ${user.name},</p>
       <p>The phone number ${user.phone} was removed from your Quiet Riots account.</p>
       <p>If this wasn't you, please contact us immediately.</p>
       <p>— Quiet Riots</p>`,
    ).catch(() => {}); // Fire and forget
  }

  return apiOk({ unlinked: true });
}
