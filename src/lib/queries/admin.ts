import { getDb } from '../db';
import type { User, UserRole, RoleType } from '@/types';

/**
 * Search users by name, email, or phone.
 * Admin-only — caller must verify role before calling.
 */
export async function searchUsers(query: string, limit = 20, offset = 0): Promise<User[]> {
  const db = getDb();
  const pattern = `%${query}%`;
  const result = await db.execute({
    sql: `SELECT * FROM users
          WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [pattern, pattern, pattern, limit, offset],
  });
  return result.rows as unknown as User[];
}

/**
 * List all users who hold any role, with their roles.
 */
export async function getUsersWithRoles(): Promise<{ user: User; roles: UserRole[] }[]> {
  const db = getDb();
  // Get all role assignments
  const rolesResult = await db.execute({
    sql: 'SELECT * FROM user_roles ORDER BY created_at ASC',
    args: [],
  });
  const allRoles = rolesResult.rows as unknown as UserRole[];

  // Group by user_id
  const byUser = new Map<string, UserRole[]>();
  for (const role of allRoles) {
    const existing = byUser.get(role.user_id) || [];
    existing.push(role);
    byUser.set(role.user_id, existing);
  }

  // Fetch each user
  const results: { user: User; roles: UserRole[] }[] = [];
  for (const [userId, roles] of byUser) {
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId],
    });
    if (userResult.rows.length > 0) {
      results.push({
        user: userResult.rows[0] as unknown as User,
        roles,
      });
    }
  }

  return results;
}

/**
 * Count total users.
 */
export async function getUserCount(): Promise<number> {
  const db = getDb();
  const result = await db.execute('SELECT COUNT(*) as count FROM users');
  return (result.rows[0] as unknown as { count: number }).count;
}

/**
 * Count users by role.
 */
export async function getRoleCount(role: RoleType): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_roles WHERE role = ?',
    args: [role],
  });
  return (result.rows[0] as unknown as { count: number }).count;
}
