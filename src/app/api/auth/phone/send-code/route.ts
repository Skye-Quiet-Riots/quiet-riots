import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { createVerificationCode, isCooldownPassed } from '@/lib/queries/phone-verification';
import { checkDbRateLimit, setDbRateLimitLock } from '@/lib/db-rate-limit';
import { getDb } from '@/lib/db';

const sendCodeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
  userId: z.string().optional(),
});

/**
 * POST /api/auth/phone/send-code
 * Generate a verification code for a phone number.
 * The code is stored in the DB with a delivery_message for WhatsApp delivery.
 * A local polling script picks up undelivered codes and sends them via OpenClaw.
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

  // Create verification code — returns plaintext code + record id
  const { id, code } = await createVerificationCode(phone, parsed.data.userId);

  // Store delivery message for WhatsApp polling delivery.
  // The local Mac polling script picks up records with delivery_message != NULL
  // and delivered_at IS NULL, sends via OpenClaw, then marks as delivered.
  const deliveryMessage = `Your Quiet Riots verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
  const db = getDb();
  await db.execute({
    sql: 'UPDATE phone_verification_codes SET delivery_message = ? WHERE id = ?',
    args: [deliveryMessage, id],
  });

  // In dev/test, also log the code for debugging (delivery script won't be running)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Verification code for ${phone}: ${code}`);
  }

  // Anti-enumeration: always return success
  return apiOk({ sent: true, expiresInSeconds: 300 });
}
