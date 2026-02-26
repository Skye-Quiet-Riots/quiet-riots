import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { hasRole, assignRole, removeRole, getUserRoles } from '@/lib/queries/roles';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import type { RoleType } from '@/types';

const assignSchema = z.object({
  user_id: z.string().min(1, 'User ID required'),
  role: z.enum(['setup_guide', 'share_guide', 'compliance_guide', 'treasury_guide']),
});

const removeSchema = z.object({
  user_id: z.string().min(1, 'User ID required'),
  role: z.enum([
    'setup_guide',
    'share_guide',
    'compliance_guide',
    'treasury_guide',
    'administrator',
  ]),
});

/**
 * GET /api/roles/team — List all users with assigned roles (administrator only)
 */
export async function GET() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT ur.*, u.name as user_name, u.email as user_email
          FROM user_roles ur
          JOIN users u ON u.id = ur.user_id
          ORDER BY ur.created_at DESC`,
    args: [],
  });

  return apiOk({ roles: result.rows });
}

/**
 * POST /api/roles/team — Assign a role (administrator only)
 * Enforces mutual exclusivity: share_guide and compliance_guide cannot coexist.
 */
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const { allowed } = rateLimit(`role-assign:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const { user_id: targetUserId, role } = parsed.data;

  // Enforce mutual exclusivity
  const EXCLUSIVE_PAIRS: [RoleType, RoleType][] = [['share_guide', 'compliance_guide']];
  for (const [roleA, roleB] of EXCLUSIVE_PAIRS) {
    if (role === roleA) {
      const existing = await getUserRoles(targetUserId);
      if (existing.some((r) => r.role === roleB)) {
        return apiError(`Cannot assign ${roleA} — user already has ${roleB}`, 400);
      }
    }
    if (role === roleB) {
      const existing = await getUserRoles(targetUserId);
      if (existing.some((r) => r.role === roleA)) {
        return apiError(`Cannot assign ${roleB} — user already has ${roleA}`, 400);
      }
    }
  }

  const result = await assignRole(targetUserId, role, userId);
  return apiOk({ role: result }, 201);
}

/**
 * DELETE /api/roles/team — Remove a role (administrator only)
 */
export async function DELETE(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const { allowed } = rateLimit(`role-remove:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const removed = await removeRole(parsed.data.user_id, parsed.data.role);
  if (!removed) return apiError('Role not found', 404);

  return apiOk({ removed: true });
}
