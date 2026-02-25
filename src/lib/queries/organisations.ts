import { getDb } from '../db';
import { escapeLike, parseSearchWords } from './issues';
import type { Organisation, Category, IssuePivotRow, OrgPivotRow } from '@/types';

/**
 * Build a LIKE clause for organisation search.
 * Searches name, and optionally translated names.
 */
function buildOrgLikeClause(includeTranslations: boolean): string {
  let clause = " (name LIKE ? ESCAPE '\\')";
  if (includeTranslations) {
    clause =
      " (name LIKE ? ESCAPE '\\'" +
      " OR id IN (SELECT entity_id FROM translations WHERE entity_type = 'organisation'" +
      " AND field = 'name' AND language_code = ? AND value LIKE ? ESCAPE '\\'))";
  }
  return clause;
}

function pushOrgLikeArgs(args: (string | number)[], escaped: string, languageCode?: string): void {
  args.push(`%${escaped}%`); // name LIKE
  if (languageCode && languageCode !== 'en') {
    args.push(languageCode); // language_code = ?
    args.push(`%${escaped}%`); // translated name LIKE
  }
}

export async function getAllOrganisations(
  category?: Category,
  search?: string,
  languageCode?: string,
): Promise<Organisation[]> {
  const db = getDb();
  let query = 'SELECT * FROM organisations WHERE 1=1';
  const args: (string | number)[] = [];
  const hasTranslations = !!languageCode && languageCode !== 'en';
  const likeClause = buildOrgLikeClause(hasTranslations);

  if (category) {
    query += ' AND category = ?';
    args.push(category);
  }

  if (search && search.trim()) {
    const words = parseSearchWords(search);

    if (words.length === 0) {
      const escaped = escapeLike(search.trim());
      query += ' AND' + likeClause;
      pushOrgLikeArgs(args, escaped, languageCode);
    } else {
      // Try AND: every word must match in name or translated name
      let andQuery = query;
      const andArgs = [...args];
      for (const word of words) {
        const escaped = escapeLike(word);
        andQuery += ' AND' + likeClause;
        pushOrgLikeArgs(andArgs, escaped, languageCode);
      }
      andQuery += ' ORDER BY name';
      const andResult = await db.execute({ sql: andQuery, args: andArgs });

      if (andResult.rows.length > 0 || words.length <= 1) {
        return andResult.rows as unknown as Organisation[];
      }

      // AND returned nothing with 2+ words — fall back to OR
      for (let i = 0; i < words.length; i++) {
        const escaped = escapeLike(words[i]);
        query += (i === 0 ? ' AND (' : ' OR') + likeClause;
        pushOrgLikeArgs(args, escaped, languageCode);
      }
      query += ')';
    }
  }

  query += ' ORDER BY name';
  const result = await db.execute({ sql: query, args });
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
