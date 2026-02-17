import { getDb } from '../db';
import type { Organisation, Category, IssuePivotRow, OrgPivotRow } from '@/types';

export async function getAllOrganisations(category?: Category): Promise<Organisation[]> {
  const db = getDb();
  if (category) {
    const result = await db.execute({
      sql: 'SELECT * FROM organisations WHERE category = ? ORDER BY name',
      args: [category],
    });
    return result.rows as unknown as Organisation[];
  }
  const result = await db.execute('SELECT * FROM organisations ORDER BY name');
  return result.rows as unknown as Organisation[];
}

export async function getOrganisationById(id: string): Promise<Organisation | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM organisations WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Organisation) ?? null;
}

// Issue Pivot: given an issue, show all orgs where this issue exists
export async function getOrgsForIssue(issueId: string): Promise<IssuePivotRow[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT
      o.id as organisation_id,
      o.name as organisation_name,
      o.logo_emoji,
      io.rioter_count,
      io.rank
    FROM issue_organisation io
    JOIN organisations o ON io.organisation_id = o.id
    WHERE io.issue_id = ?
    ORDER BY io.rioter_count DESC
  `,
    args: [issueId],
  });
  return result.rows as unknown as IssuePivotRow[];
}

// Org Pivot: given an org, show all issues (Pareto-ranked)
export async function getIssuesForOrg(orgId: string): Promise<OrgPivotRow[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT
      i.id as issue_id,
      i.name as issue_name,
      io.rioter_count,
      io.rank
    FROM issue_organisation io
    JOIN issues i ON io.issue_id = i.id
    WHERE io.organisation_id = ?
    ORDER BY io.rioter_count DESC
  `,
    args: [orgId],
  });
  return result.rows as unknown as OrgPivotRow[];
}

// Count of issues per org (for org cards)
export async function getIssueCountForOrg(orgId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM issue_organisation WHERE organisation_id = ?',
    args: [orgId],
  });
  return (result.rows[0]?.count as number) ?? 0;
}

// Get total rioters for an org across all issues
export async function getTotalRiotersForOrg(orgId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT SUM(rioter_count) as total FROM issue_organisation WHERE organisation_id = ?',
    args: [orgId],
  });
  return (result.rows[0]?.total as number) ?? 0;
}
