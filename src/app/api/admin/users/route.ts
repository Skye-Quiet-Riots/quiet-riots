import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { searchUsers, getUsersWithRoles, getUserCount, getRoleCount } from '@/lib/queries/admin';
import { apiOk, apiError } from '@/lib/api-response';

/** GET /api/admin/users — search users or list users with roles (admin only) */
export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (search) {
    const users = await searchUsers(search, limit, offset);
    return apiOk({ users });
  }

  // No search query — return users with roles + stats
  const [usersWithRoles, totalUsers, guideCount, adminCount] = await Promise.all([
    getUsersWithRoles(),
    getUserCount(),
    getRoleCount('setup_guide'),
    getRoleCount('administrator'),
  ]);

  return apiOk({
    users_with_roles: usersWithRoles,
    stats: { total_users: totalUsers, setup_guides: guideCount, administrators: adminCount },
  });
}
