import { getSession } from '@/lib/session';
import { exportUserData } from '@/lib/queries/privacy';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`export:${userId}`, {
    maxRequests: 1,
    windowMs: 86_400_000, // 24 hours
  });
  if (!allowed) {
    return apiError('Too many requests — data export is limited to once per 24 hours', 429);
  }

  const data = await exportUserData(userId);
  if (!data) {
    return apiError('User not found', 404);
  }

  return apiOk(data);
}
