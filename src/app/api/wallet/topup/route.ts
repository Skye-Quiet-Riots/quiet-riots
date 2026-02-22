import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import {
  getOrCreateWallet,
  createTopupTransaction,
  completeTopup,
  getWalletByUserId,
} from '@/lib/queries/wallet';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const topupSchema = z.object({
  amount_pence: z.number().int().min(100, 'Minimum top-up is £1'),
});

export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 401);
  }
  const { allowed } = rateLimit(`topup:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = topupSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const wallet = await getOrCreateWallet(userId);
  const { transaction } = await createTopupTransaction(wallet.id, parsed.data.amount_pence);

  // Simulated: instantly credit the wallet (no Stripe checkout needed)
  await completeTopup(transaction.id, 'simulated');

  const updatedWallet = await getWalletByUserId(userId);
  return apiOk({ transaction, wallet: updatedWallet });
}
