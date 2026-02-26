import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { createVerificationCode, isCooldownPassed } from '@/lib/queries/phone-verification';
import { checkDbRateLimit, setDbRateLimitLock } from '@/lib/db-rate-limit';

const sendCodeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
  userId: z.string().optional(),
});

/**
 * POST /api/auth/phone/send-code
 * Send a verification code to a phone number via WhatsApp.
 *
 * Anti-enumeration: returns the same response regardless of whether
 * the phone number is known or not.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = sendCodeSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const phone = parsed.data.phone.trim();

  // DB-backed rate limiting: 3 codes per 5 minutes per phone
  const rateCheck = await checkDbRateLimit(phone, 'send_code', 3, 5 * 60 * 1000);
  if (!rateCheck.allowed) {
    // Escalating lockout after repeated rate limit hits
    if (rateCheck.count >= 6) {
      await setDbRateLimitLock(phone, 'send_code', 60 * 60 * 1000); // 1 hour
    } else if (rateCheck.count >= 4) {
      await setDbRateLimitLock(phone, 'send_code', 15 * 60 * 1000); // 15 minutes
    }
    return apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
  }

  // 60-second cooldown between requests
  const cooldownOk = await isCooldownPassed(phone, 60_000);
  if (!cooldownOk) {
    return apiError('Please wait before requesting another code.', 429, 'RATE_LIMITED');
  }

  // Create verification code
  const { code } = await createVerificationCode(phone, parsed.data.userId);

  // Send code via WhatsApp bot API
  // In development/test, just log it. In production, call the bot API.
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
      // Silently fail — we still return success (anti-enumeration)
      console.error('Failed to send WhatsApp verification code');
    }
  } else {
    // In dev/test, log the code for debugging
    console.log(`[DEV] Verification code for ${phone}: ${code}`);
  }

  // Anti-enumeration: always return success
  return apiOk({ sent: true, expiresInSeconds: 300 });
}
