import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import { createContribution, getOrCreateWallet } from '@/lib/queries/wallet';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const contributeSchema = z.object({
  campaign_id: z.string().min(1, 'Campaign ID required'),
  amount_pence: z.number().int().min(10, 'Minimum contribution is 10p'),
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
  const { allowed } = rateLimit(`contribute:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  try {
    const result = await createContribution(
      userId,
      parsed.data.campaign_id,
      parsed.data.amount_pence,
    );
    const wallet = await getOrCreateWallet(userId);
    return apiOk({
      transaction: result.transaction,
      campaign: result.campaign,
      wallet_balance_pence: wallet.balance_pence,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Contribution failed';
    if (message === 'Insufficient funds') return apiError(message);
    if (message === 'Campaign not found') return apiError(message, 404);
    if (message === 'Campaign is not active') return apiError(message);
    if (message === 'Wallet not found') return apiError(message, 404);
    throw e;
  }
}
