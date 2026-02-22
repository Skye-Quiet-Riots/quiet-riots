import { getSession } from '@/lib/session';
import { getOrCreateWallet, getUserSpendingSummary } from '@/lib/queries/wallet';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const wallet = await getOrCreateWallet(userId);
  const summary = await getUserSpendingSummary(userId);
  return apiOk({ wallet, summary });
}
