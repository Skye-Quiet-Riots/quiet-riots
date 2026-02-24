import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Issue, Category } from '@/types';

export async function getAllIssues(
  category?: Category,
  search?: string,
  countryCode?: string,
): Promise<Issue[]> {
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
  if (countryCode) {
    query +=
      " AND (country_scope = 'global' OR (country_scope = 'country' AND primary_country = ?))";
    args.push(countryCode.toUpperCase());
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
  country_scope?: 'global' | 'country';
  primary_country?: string;
}): Promise<Issue> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO issues (id, name, category, description, country_scope, primary_country) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      id,
      data.name,
      data.category,
      data.description || '',
      data.country_scope || 'global',
      data.primary_country || null,
    ],
  });
  const issue = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id] });
  return issue.rows[0] as unknown as Issue;
}

export async function getIssuesForCountry(
  countryCode: string,
  category?: Category,
): Promise<Issue[]> {
  const db = getDb();
  let query =
    "SELECT * FROM issues WHERE (country_scope = 'global' OR (country_scope = 'country' AND primary_country = ?))";
  const args: (string | number)[] = [countryCode.toUpperCase()];

  if (category) {
    query += ' AND category = ?';
    args.push(category);
  }

  query += ' ORDER BY rioter_count DESC';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as Issue[];
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
