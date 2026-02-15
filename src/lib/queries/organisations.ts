import { getDb } from '../db';
import type { Organisation, Category, IssuePivotRow, OrgPivotRow } from '@/types';

export function getAllOrganisations(category?: Category): Organisation[] {
  const db = getDb();
  if (category) {
    return db.prepare('SELECT * FROM organisations WHERE category = ? ORDER BY name').all(category) as Organisation[];
  }
  return db.prepare('SELECT * FROM organisations ORDER BY name').all() as Organisation[];
}

export function getOrganisationById(id: number): Organisation | null {
  const db = getDb();
  return db.prepare('SELECT * FROM organisations WHERE id = ?').get(id) as Organisation | null;
}

// Issue Pivot: given an issue, show all orgs where this issue exists
export function getOrgsForIssue(issueId: number): IssuePivotRow[] {
  const db = getDb();
  return db.prepare(`
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
  `).all(issueId) as IssuePivotRow[];
}

// Org Pivot: given an org, show all issues (Pareto-ranked)
export function getIssuesForOrg(orgId: number): OrgPivotRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      i.id as issue_id,
      i.name as issue_name,
      io.rioter_count,
      io.rank
    FROM issue_organisation io
    JOIN issues i ON io.issue_id = i.id
    WHERE io.organisation_id = ?
    ORDER BY io.rioter_count DESC
  `).all(orgId) as OrgPivotRow[];
}

// Count of issues per org (for org cards)
export function getIssueCountForOrg(orgId: number): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM issue_organisation WHERE organisation_id = ?').get(orgId) as { count: number };
  return row.count;
}

// Get total rioters for an org across all issues
export function getTotalRiotersForOrg(orgId: number): number {
  const db = getDb();
  const row = db.prepare('SELECT SUM(rioter_count) as total FROM issue_organisation WHERE organisation_id = ?').get(orgId) as { total: number | null };
  return row.total ?? 0;
}
