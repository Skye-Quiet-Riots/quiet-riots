import { getDb } from '../db';
import type { Synonym } from '@/types';

export function getSynonymsForIssue(issueId: number): Synonym[] {
  const db = getDb();
  return db.prepare('SELECT * FROM synonyms WHERE issue_id = ?').all(issueId) as Synonym[];
}

export function addSynonym(issueId: number, term: string): Synonym {
  const db = getDb();
  const result = db.prepare('INSERT INTO synonyms (issue_id, term) VALUES (?, ?)').run(issueId, term);
  return db.prepare('SELECT * FROM synonyms WHERE id = ?').get(result.lastInsertRowid) as Synonym;
}
