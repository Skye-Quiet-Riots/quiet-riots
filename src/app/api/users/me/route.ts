import { getSession } from '@/lib/session';
import { getUserById, getUserIssues } from '@/lib/queries/users';
import { deactivateAccount } from '@/lib/queries/privacy';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 404);
  }

  const issues = await getUserIssues(userId);
  return apiOk({ user, issues });
}

export async function DELETE() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`deactivate:${userId}`, {
    maxRequests: 5,
    windowMs: 3_600_000, // 1 hour
  });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const user = await deactivateAccount(userId);
  if (!user) {
    return apiError('User not found', 404);
  }

  return apiOk({
    message: 'Account deactivated. You have 30 days to reactivate before permanent deletion.',
    deactivated_at: user.deactivated_at,
  });
}
