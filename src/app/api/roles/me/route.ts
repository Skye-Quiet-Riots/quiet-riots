import { getSession } from '@/lib/session';
import { getUserRoles } from '@/lib/queries/roles';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const roles = await getUserRoles(userId);
  return apiOk({ roles: roles.map((r) => r.role) });
}
