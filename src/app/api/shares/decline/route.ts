import { getSession } from '@/lib/session';
import { declineShare } from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * POST /api/shares/decline — Decline share (permanent, no payment)
 */
export async function POST() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-decline:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const declined = await declineShare(userId);
  if (!declined) {
    return apiError('Cannot decline — not in available status', 400);
  }

  return apiOk({ declined: true });
}
