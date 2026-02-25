import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Issue, Category } from '@/types';

/** Escape SQL LIKE metacharacters so they match literally. */
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'are',
  'for',
  'not',
  'but',
  'had',
  'has',
  'was',
  'were',
  'been',
  'being',
  'have',
  'with',
  'this',
  'that',
  'from',
  'they',
  'which',
  'their',
  'there',
  'about',
  'would',
  'could',
  'should',
  'into',
  'than',
  'other',
  'some',
  'what',
  'when',
  'where',
  'very',
  'just',
  'also',
  'really',
  'still',
  'much',
  'many',
  'always',
  'never',
  'keep',
  'keeps',
  'getting',
]);

const MAX_SEARCH_WORDS = 5;

/**
 * Extract meaningful search words from a query string.
 * Filters stop words, short words, and caps at MAX_SEARCH_WORDS.
 */
export function parseSearchWords(search: string): string[] {
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, MAX_SEARCH_WORDS);
}

function buildLikeClause(): string {
  return " (name LIKE ? ESCAPE '\\' OR id IN (SELECT issue_id FROM synonyms WHERE term LIKE ? ESCAPE '\\'))";
}

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
  if (search && search.trim()) {
    const words = parseSearchWords(search);

    if (words.length === 0) {
      // All words were stop words or too short — fall back to full-phrase LIKE
      const escaped = escapeLike(search.trim());
      query += ' AND' + buildLikeClause();
      args.push(`%${escaped}%`, `%${escaped}%`);
    } else {
      // Try AND: every word must match in name or synonyms
      let andQuery = query;
      const andArgs = [...args];
      for (const word of words) {
        const escaped = escapeLike(word);
        andQuery += ' AND' + buildLikeClause();
        andArgs.push(`%${escaped}%`, `%${escaped}%`);
      }

      if (countryCode) {
        andQuery +=
          " AND (country_scope = 'global' OR (country_scope = 'country' AND primary_country = ?))";
        andArgs.push(countryCode.toUpperCase());
      }

      andQuery += ' ORDER BY rioter_count DESC';
      const andResult = await db.execute({ sql: andQuery, args: andArgs });

      if (andResult.rows.length > 0 || words.length <= 1) {
        return andResult.rows as unknown as Issue[];
      }

      // AND returned nothing with 2+ words — fall back to OR (any word matches)
      for (let i = 0; i < words.length; i++) {
        const escaped = escapeLike(words[i]);
        query += (i === 0 ? ' AND (' : ' OR') + buildLikeClause();
        args.push(`%${escaped}%`, `%${escaped}%`);
      }
      query += ')';
    }
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
