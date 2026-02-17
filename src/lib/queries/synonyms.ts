import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Synonym } from '@/types';

export async function getSynonymsForIssue(issueId: string): Promise<Synonym[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM synonyms WHERE issue_id = ?',
    args: [issueId],
  });
  return result.rows as unknown as Synonym[];
}

export async function addSynonym(issueId: string, term: string): Promise<Synonym> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)',
    args: [id, issueId, term],
  });
  const result = await db.execute({ sql: 'SELECT * FROM synonyms WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as Synonym;
}
