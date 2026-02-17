import { getSession } from '@/lib/session';
import { joinIssue, leaveIssue } from '@/lib/queries/users';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const { allowed } = rateLimit(`join:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  await joinIssue(userId, id);
  return apiOk({ joined: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }
  const { allowed } = rateLimit(`leave:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  await leaveIssue(userId, id);
  return apiOk({ left: true });
}
