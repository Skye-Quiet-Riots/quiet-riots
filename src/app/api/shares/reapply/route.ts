import { getSession } from '@/lib/session';
import { reapplyForShare } from '@/lib/queries/shares';
import { getOrCreateWallet } from '@/lib/queries/wallet';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * POST /api/shares/reapply — Reapply after rejection (another 10p)
 */
export async function POST() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-reapply:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const wallet = await getOrCreateWallet(userId);
  const result = await reapplyForShare(userId, wallet.id);

  if (!result.success) {
    return apiError(result.error || 'Failed to reapply', 400);
  }

  return apiOk({
    application: {
      id: result.application!.id,
      status: result.application!.status,
      reapply_count: result.application!.reapply_count,
    },
  });
}
