import { getSession } from '@/lib/session';
import { withdrawShare } from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * POST /api/shares/withdraw — Cancel application (refund 10p)
 */
export async function POST() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-withdraw:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const withdrawn = await withdrawShare(userId);
  if (!withdrawn) {
    return apiError('Cannot withdraw — must be under_review or approved', 400);
  }

  return apiOk({ withdrawn: true });
}
