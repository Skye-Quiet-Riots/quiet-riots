import { getSession } from '@/lib/session';
import { followIssue, unfollowIssue } from '@/lib/queries/users';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const { allowed } = rateLimit(`follow:${userId}`, { maxRequests: 10 });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const result = await followIssue(userId, id, false);

  switch (result) {
    case 'not_found':
      return apiError('Issue not found', 404);
    case 'max_reached':
      return apiError('Maximum follow limit reached', 400);
    case 'already_following':
      return apiOk({ followed: true, already: true });
    case 'followed':
      return apiOk({ followed: true });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const { allowed } = rateLimit(`unfollow:${userId}`, { maxRequests: 10 });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  await unfollowIssue(userId, id);
  return apiOk({ unfollowed: true });
}
