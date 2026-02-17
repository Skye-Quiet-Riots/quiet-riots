import { getDb } from '../db';
import type { Synonym } from '@/types';

export async function getSynonymsForIssue(issueId: number): Promise<Synonym[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM synonyms WHERE issue_id = ?',
    args: [issueId],
  });
  return result.rows as unknown as Synonym[];
}

export async function addSynonym(issueId: number, term: string): Promise<Synonym> {
  const db = getDb();
  const insertResult = await db.execute({
    sql: 'INSERT INTO synonyms (issue_id, term) VALUES (?, ?)',
    args: [issueId, term],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM synonyms WHERE id = ?',
    args: [Number(insertResult.lastInsertRowid)],
  });
  return result.rows[0] as unknown as Synonym;
}
