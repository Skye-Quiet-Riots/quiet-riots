import { getDb } from '../db';
import type { User, UserIssue, Issue } from '@/types';

export function getUserById(id: number): User | null {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null;
}

export function getUserByPhone(phone: string): User | null {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | null;
}

export function createUser(data: { name: string; email: string; phone?: string; time_available?: string; skills?: string }): User {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO users (name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?)'
  ).run(data.name, data.email, data.phone || null, data.time_available || '10min', data.skills || '');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
}

export function updateUser(id: number, data: { name?: string; phone?: string; time_available?: string; skills?: string }): User | null {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.phone !== undefined) { sets.push('phone = ?'); params.push(data.phone); }
  if (data.time_available !== undefined) { sets.push('time_available = ?'); params.push(data.time_available); }
  if (data.skills !== undefined) { sets.push('skills = ?'); params.push(data.skills); }

  if (sets.length === 0) return getUserById(id);

  params.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getUserById(id);
}

export function getUserIssues(userId: number): (UserIssue & { issue: Issue })[] {
  const db = getDb();
  return db.prepare(`
    SELECT ui.*, i.name as issue_name, i.category, i.rioter_count, i.trending_delta,
           i.description, i.country_count, i.created_at as issue_created_at
    FROM user_issues ui
    JOIN issues i ON ui.issue_id = i.id
    WHERE ui.user_id = ?
    ORDER BY ui.joined_at DESC
  `).all(userId) as (UserIssue & { issue: Issue })[];
}

export function joinIssue(userId: number, issueId: number): void {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO user_issues (user_id, issue_id) VALUES (?, ?)').run(userId, issueId);
}

export function leaveIssue(userId: number, issueId: number): void {
  const db = getDb();
  db.prepare('DELETE FROM user_issues WHERE user_id = ? AND issue_id = ?').run(userId, issueId);
}

export function hasJoinedIssue(userId: number, issueId: number): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM user_issues WHERE user_id = ? AND issue_id = ?').get(userId, issueId);
  return !!row;
}
