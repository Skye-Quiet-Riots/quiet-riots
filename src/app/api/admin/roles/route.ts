import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { hasRole, assignRole, removeRole } from '@/lib/queries/roles';
import { getUserById } from '@/lib/queries/users';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const schema = z.object({
  user_id: z.string().min(1, 'User ID required'),
  role: z.enum(['setup_guide', 'administrator']),
  action: z.enum(['assign', 'remove']),
});

/** POST /api/admin/roles — assign or remove roles (admin only) */
export async function POST(request: NextRequest) {
  const adminId = await getSession();
  if (!adminId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(adminId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`admin-role:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const { user_id, role, action } = parsed.data;

  // Verify target user exists
  const targetUser = await getUserById(user_id);
  if (!targetUser) return apiError('User not found', 404);

  // Prevent removing own admin role
  if (action === 'remove' && user_id === adminId && role === 'administrator') {
    return apiError('Cannot remove your own administrator role', 400);
  }

  if (action === 'assign') {
    const result = await assignRole(user_id, role, adminId);
    return apiOk({ role: result, action: 'assigned' });
  } else {
    const removed = await removeRole(user_id, role);
    return apiOk({ removed, action: 'removed' });
  }
}
