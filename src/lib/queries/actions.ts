import { getDb } from '../db';
import type { Action } from '@/types';

export async function getActionsForIssue(issueId: number): Promise<Action[]> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM actions WHERE issue_id = ? ORDER BY type, time_required', args: [issueId] });
  return result.rows as unknown as Action[];
}

export async function getActionsByType(issueId: number, type: 'idea' | 'action' | 'together'): Promise<Action[]> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM actions WHERE issue_id = ? AND type = ? ORDER BY time_required', args: [issueId, type] });
  return result.rows as unknown as Action[];
}

export async function getFilteredActions(
  issueId: number,
  options?: { type?: string; time?: string; skills?: string }
): Promise<Action[]> {
  const db = getDb();
  let query = 'SELECT * FROM actions WHERE issue_id = ?';
  const args: (string | number)[] = [issueId];

  if (options?.type) {
    query += ' AND type = ?';
    args.push(options.type);
  }
  if (options?.time) {
    query += ' AND time_required = ?';
    args.push(options.time);
  }
  if (options?.skills) {
    const skillList = options.skills.split(',');
    const conditions = skillList.map(() => "skills_needed LIKE ?");
    query += ` AND (skills_needed = '' OR ${conditions.join(' OR ')})`;
    for (const skill of skillList) {
      args.push(`%${skill.trim()}%`);
    }
  }

  query += ' ORDER BY type, time_required';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as Action[];
}

export async function getActionCountForIssue(issueId: number): Promise<number> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT COUNT(*) as count FROM actions WHERE issue_id = ?', args: [issueId] });
  return (result.rows[0]?.count as number) ?? 0;
}
