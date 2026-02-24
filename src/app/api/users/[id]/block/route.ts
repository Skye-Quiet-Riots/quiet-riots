import { getSession } from '@/lib/session';
import { blockUser, unblockUser } from '@/lib/queries/social';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`block:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  try {
    const block = await blockUser(userId, id);
    return apiOk(block, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot block yourself') {
      return apiError('Cannot block yourself', 400);
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  await unblockUser(userId, id);
  return apiOk({ unblocked: true });
}
