import { getSession } from '@/lib/session';
import { getUserById, getUserIssues } from '@/lib/queries/users';
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
