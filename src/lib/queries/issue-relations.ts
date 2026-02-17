import { getDb } from '../db';
import type { IssueRelation } from '@/types';

export interface RelatedIssue {
  issue_id: string;
  issue_name: string;
  relation_type: 'specific_of' | 'related_to' | 'subset_of';
  rioter_count: number;
}

export async function getRelatedIssues(issueId: string): Promise<RelatedIssue[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT i.id as issue_id, i.name as issue_name, ir.relation_type, i.rioter_count
    FROM issue_relations ir
    JOIN issues i ON (
      CASE WHEN ir.child_id = ? THEN ir.parent_id ELSE ir.child_id END
    ) = i.id
    WHERE ir.child_id = ? OR ir.parent_id = ?
    ORDER BY i.rioter_count DESC
    `,
    args: [issueId, issueId, issueId],
  });
  return result.rows as unknown as RelatedIssue[];
}

export async function getIssueRelation(
  childId: string,
  parentId: string,
): Promise<IssueRelation | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM issue_relations WHERE child_id = ? AND parent_id = ?',
    args: [childId, parentId],
  });
  return (result.rows[0] as unknown as IssueRelation) ?? null;
}
