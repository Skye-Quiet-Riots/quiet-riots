import { getDb } from '../db';
import type { Issue, Category } from '@/types';

export function getAllIssues(category?: Category, search?: string): Issue[] {
  const db = getDb();
  let query = 'SELECT * FROM issues WHERE 1=1';
  const params: (string | number)[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR id IN (SELECT issue_id FROM synonyms WHERE term LIKE ?))';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY rioter_count DESC';
  return db.prepare(query).all(...params) as Issue[];
}

export function getIssueById(id: number): Issue | null {
  const db = getDb();
  return db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as Issue | null;
}

export function getIssuesByCategory(category: Category): Issue[] {
  const db = getDb();
  return db.prepare('SELECT * FROM issues WHERE category = ? ORDER BY rioter_count DESC').all(category) as Issue[];
}

export function getTrendingIssues(limit: number = 6): Issue[] {
  const db = getDb();
  return db.prepare('SELECT * FROM issues ORDER BY trending_delta DESC LIMIT ?').all(limit) as Issue[];
}

export function getIssueCountsByCategory(): Record<string, number> {
  const db = getDb();
  const rows = db.prepare('SELECT category, COUNT(*) as count FROM issues GROUP BY category').all() as { category: string; count: number }[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.category] = row.count;
  }
  return result;
}
