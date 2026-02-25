import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { markAllAsRead } from '@/lib/queries/messages';
import { apiOk, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(ip);
  if (!allowed) return apiError('Too many requests', 429);

  const count = await markAllAsRead(userId);
  return apiOk({ marked_count: count });
}
