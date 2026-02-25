import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { UserRole, RoleType } from '@/types';

export async function assignRole(
  userId: string,
  role: RoleType,
  assignedBy?: string,
): Promise<UserRole> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)`,
    args: [id, userId, role, assignedBy ?? null],
  });
  // Return the existing or newly inserted row
  const result = await db.execute({
    sql: 'SELECT * FROM user_roles WHERE user_id = ? AND role = ?',
    args: [userId, role],
  });
  return result.rows[0] as unknown as UserRole;
}

export async function removeRole(userId: string, role: RoleType): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM user_roles WHERE user_id = ? AND role = ?',
    args: [userId, role],
  });
  return result.rowsAffected > 0;
}

export async function hasRole(userId: string, role: RoleType): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?',
    args: [userId, role],
  });
  return result.rows.length > 0;
}

export async function hasAnyRole(userId: string, roles: RoleType[]): Promise<boolean> {
  if (roles.length === 0) return false;
  const db = getDb();
  const placeholders = roles.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT 1 FROM user_roles WHERE user_id = ? AND role IN (${placeholders}) LIMIT 1`,
    args: [userId, ...roles],
  });
  return result.rows.length > 0;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_roles WHERE user_id = ? ORDER BY created_at ASC',
    args: [userId],
  });
  return result.rows as unknown as UserRole[];
}

export async function getUsersByRole(role: RoleType): Promise<UserRole[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_roles WHERE role = ? ORDER BY created_at ASC',
    args: [role],
  });
  return result.rows as unknown as UserRole[];
}
