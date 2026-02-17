import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Issue, Category } from '@/types';

export async function getAllIssues(category?: Category, search?: string): Promise<Issue[]> {
  const db = getDb();
  let query = 'SELECT * FROM issues WHERE 1=1';
  const args: (string | number)[] = [];

  if (category) {
    query += ' AND category = ?';
    args.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR id IN (SELECT issue_id FROM synonyms WHERE term LIKE ?))';
    args.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY rioter_count DESC';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as Issue[];
}

export async function getIssueById(id: string): Promise<Issue | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as Issue) ?? null;
}

export async function getIssuesByCategory(category: Category): Promise<Issue[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM issues WHERE category = ? ORDER BY rioter_count DESC',
    args: [category],
  });
  return result.rows as unknown as Issue[];
}

export async function getTrendingIssues(limit: number = 6): Promise<Issue[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM issues ORDER BY trending_delta DESC LIMIT ?',
    args: [limit],
  });
  return result.rows as unknown as Issue[];
}

export async function createIssue(data: {
  name: string;
  category: Category;
  description?: string;
}): Promise<Issue> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO issues (id, name, category, description) VALUES (?, ?, ?, ?)',
    args: [id, data.name, data.category, data.description || ''],
  });
  const issue = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id] });
  return issue.rows[0] as unknown as Issue;
}

export async function getIssueCountsByCategory(): Promise<Record<string, number>> {
  const db = getDb();
  const result = await db.execute(
    'SELECT category, COUNT(*) as count FROM issues GROUP BY category',
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.category as string] = row.count as number;
  }
  return counts;
}
