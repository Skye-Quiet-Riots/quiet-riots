import { type NextRequest } from 'next/server';
import { handlers } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

export const { GET } = handlers;

/**
 * Wrap Auth.js POST handler with rate limiting.
 * POST triggers email sends (magic links) — limit to 5/min per IP to prevent Resend quota abuse.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`auth-post:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!allowed) {
    return apiError('Too many requests', 429, 'RATE_LIMITED');
  }
  return handlers.POST(request);
}
