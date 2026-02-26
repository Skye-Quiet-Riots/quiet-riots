import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import { createPayment, getOrCreateWallet } from '@/lib/queries/wallet';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const paySchema = z.object({
  action_initiative_id: z.string().min(1, 'Action initiative ID required').max(64),
  amount_pence: z.number().int().min(10, 'Minimum payment is 10p').max(1000000),
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
  const { allowed } = rateLimit(`payment:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  try {
    const result = await createPayment(
      userId,
      parsed.data.action_initiative_id,
      parsed.data.amount_pence,
    );
    const wallet = await getOrCreateWallet(userId);
    return apiOk({
      transaction: result.transaction,
      actionInitiative: result.actionInitiative,
      wallet_balance_pence: wallet.balance_pence,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Payment failed';
    if (message === 'Insufficient funds') return apiError(message);
    if (message === 'Action initiative not found') return apiError(message, 404);
    if (message === 'Action initiative is not active') return apiError(message);
    if (message === 'Wallet not found') return apiError(message, 404);
    throw e;
  }
}
