import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { User, UserIssue, Issue } from '@/types';

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE phone = ?', args: [phone] });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  time_available?: string;
  skills?: string;
}): Promise<User> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      id,
      data.name,
      data.email,
      data.phone || null,
      data.time_available || '10min',
      data.skills || '',
    ],
  });
  const user = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return user.rows[0] as unknown as User;
}

export async function updateUser(
  id: string,
  data: { name?: string; phone?: string; time_available?: string; skills?: string },
): Promise<User | null> {
  const db = getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    args.push(data.name);
  }
  if (data.phone !== undefined) {
    sets.push('phone = ?');
    args.push(data.phone);
  }
  if (data.time_available !== undefined) {
    sets.push('time_available = ?');
    args.push(data.time_available);
  }
  if (data.skills !== undefined) {
    sets.push('skills = ?');
    args.push(data.skills);
  }

  if (sets.length === 0) return getUserById(id);

  args.push(id);
  await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args });
  return getUserById(id);
}

export async function getUserIssues(userId: string): Promise<(UserIssue & { issue: Issue })[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT ui.*, i.name as issue_name, i.category, i.rioter_count, i.trending_delta,
           i.description, i.country_count, i.created_at as issue_created_at
    FROM user_issues ui
    JOIN issues i ON ui.issue_id = i.id
    WHERE ui.user_id = ?
    ORDER BY ui.joined_at DESC
  `,
    args: [userId],
  });
  return result.rows as unknown as (UserIssue & { issue: Issue })[];
}

export async function joinIssue(userId: string, issueId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_issues (user_id, issue_id) VALUES (?, ?)',
    args: [userId, issueId],
  });
}

export async function leaveIssue(userId: string, issueId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'DELETE FROM user_issues WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
}

export async function hasJoinedIssue(userId: string, issueId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM user_issues WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
  return result.rows.length > 0;
}
