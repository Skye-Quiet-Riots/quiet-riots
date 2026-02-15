import { getDb } from '../db';
import type { Action } from '@/types';

export function getActionsForIssue(issueId: number): Action[] {
  const db = getDb();
  return db.prepare('SELECT * FROM actions WHERE issue_id = ? ORDER BY type, time_required').all(issueId) as Action[];
}

export function getActionsByType(issueId: number, type: 'idea' | 'action' | 'together'): Action[] {
  const db = getDb();
  return db.prepare('SELECT * FROM actions WHERE issue_id = ? AND type = ? ORDER BY time_required').all(issueId, type) as Action[];
}

export function getFilteredActions(
  issueId: number,
  options?: { type?: string; time?: string; skills?: string }
): Action[] {
  const db = getDb();
  let query = 'SELECT * FROM actions WHERE issue_id = ?';
  const params: (string | number)[] = [issueId];

  if (options?.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }
  if (options?.time) {
    query += ' AND time_required = ?';
    params.push(options.time);
  }
  if (options?.skills) {
    const skillList = options.skills.split(',');
    const conditions = skillList.map(() => "skills_needed LIKE ?");
    query += ` AND (skills_needed = '' OR ${conditions.join(' OR ')})`;
    for (const skill of skillList) {
      params.push(`%${skill.trim()}%`);
    }
  }

  query += ' ORDER BY type, time_required';
  return db.prepare(query).all(...params) as Action[];
}

export function getActionCountForIssue(issueId: number): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM actions WHERE issue_id = ?').get(issueId) as { count: number };
  return row.count;
}
