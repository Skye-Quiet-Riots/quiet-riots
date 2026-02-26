import { createHmac } from 'crypto';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const accessSchema = z.object({
  password: z.string().min(1, 'Password required').max(100),
});

/**
 * POST /api/shares/access — Password gate for /share pages.
 * Sets `qr_share_access` cookie bound to userId via HMAC.
 */
export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`share-access:${ip}`, { maxRequests: 5, windowMs: 60000 }); // 5 attempts per minute
  if (!allowed) return apiError('Too many attempts', 429);

  const body = await request.json();
  const parsed = accessSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const expected = process.env.SHARE_ACCESS_PASSWORD;
  if (!expected) return apiError('Share access not configured', 500);

  if (parsed.data.password !== expected) {
    return apiError('Incorrect password', 403);
  }

  // Set HMAC-bound cookie
  const hmac = createHmac('sha256', expected).update(userId).digest('hex');
  const cookieStore = await cookies();
  cookieStore.set('qr_share_access', hmac, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return apiOk({ granted: true });
}
