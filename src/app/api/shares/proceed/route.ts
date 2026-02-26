import { getSession } from '@/lib/session';
import { proceedWithShare } from '@/lib/queries/shares';
import { getOrCreateWallet } from '@/lib/queries/wallet';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * POST /api/shares/proceed — Pay 10p + apply (available → under_review)
 */
export async function POST() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-proceed:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const wallet = await getOrCreateWallet(userId);
  const result = await proceedWithShare(userId, wallet.id);

  if (!result.success) {
    return apiError(result.error || 'Failed to proceed', 400);
  }

  return apiOk({
    application: {
      id: result.application!.id,
      status: result.application!.status,
      payment_amount_pence: result.application!.payment_amount_pence,
    },
  });
}
