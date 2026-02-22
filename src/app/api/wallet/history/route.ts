import { getSession } from '@/lib/session';
import { getWalletByUserId, getWalletTransactions } from '@/lib/queries/wallet';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const wallet = await getWalletByUserId(userId);
  if (!wallet) {
    return apiOk({ transactions: [] });
  }
  const transactions = await getWalletTransactions(wallet.id);
  return apiOk({ transactions });
}
