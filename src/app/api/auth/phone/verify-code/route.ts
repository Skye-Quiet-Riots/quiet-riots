import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { verifyCode } from '@/lib/queries/phone-verification';
import { getUserByPhone, updateUser } from '@/lib/queries/users';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';

const verifyCodeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((p) => /^\+[1-9]\d{6,14}$/.test(p.trim()), 'Invalid phone number format (E.164)'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

/**
 * POST /api/auth/phone/verify-code
 * Verify a phone verification code.
 * On success, marks the phone as verified and returns a verification token.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = verifyCodeSchema.safeParse(body);
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

  // If a user exists with this phone, mark as verified
  const user = await getUserByPhone(phone);
  if (user) {
    await updateUser(user.id, { phone: user.phone ?? phone });
    // Mark phone as verified directly
    const db = getDb();
    await db.execute({
      sql: 'UPDATE users SET phone_verified = 1 WHERE id = ?',
      args: [user.id],
    });
  }

  // Generate a verification token (opaque, stored in DB, consistent with magic link pattern)
  const token = generateId();
  const db = getDb();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
  await db.execute({
    sql: 'INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)',
    args: [phone, token, expiresAt],
  });

  return apiOk({
    verified: true,
    token,
    userId: user?.id ?? null,
  });
}
