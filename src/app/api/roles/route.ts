import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assignRole, removeRole } from '@/lib/queries/roles';
import { hasRole } from '@/lib/queries/roles';
import { sendNotification } from '@/lib/queries/messages';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const roleSchema = z.object({
  user_id: z.string().min(1, 'User ID required'),
  role: z.enum(['setup_guide', 'administrator']),
  action: z.enum(['assign', 'remove']),
});

/** POST /api/roles — assign or remove a role (administrator only) */
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`role:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const { user_id, role, action } = parsed.data;

  if (action === 'assign') {
    const result = await assignRole(user_id, role, userId);
    sendNotification({
      recipientId: user_id,
      type: 'role_assigned',
      subject: `You're now a ${role === 'setup_guide' ? 'Setup Guide' : 'Administrator'}`,
      body: `You've been given the ${role === 'setup_guide' ? 'Setup Guide' : 'Administrator'} role for Quiet Riots.`,
    }).catch(() => {});
    return apiOk({ role: result });
  } else {
    const removed = await removeRole(user_id, role);
    return apiOk({ removed });
  }
}
