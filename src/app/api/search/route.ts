import { NextRequest, NextResponse } from 'next/server';
import { getDb, withTimeout } from '@/lib/db';
import { apiOk, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import { trimAndLimit } from '@/lib/sanitize';
import { isValidLocale } from '@/i18n/locales';
import { escapeLike, parseSearchWords } from '@/lib/queries/issues';
import { translateEntities } from '@/lib/queries/translate';
import type { Issue, Organisation } from '@/types';

/** CJK locales where a single character is a meaningful word. */
const CJK_LOCALES = new Set(['zh-CN', 'zh-TW', 'ja', 'ko']);

/** Max search words (stricter than the default 5 for performance). */
const SEARCH_MAX_WORDS = 3;

/** Results per entity type. */
const RESULTS_PER_TYPE = 5;

function getMinSearchLength(locale?: string): number {
  return locale && CJK_LOCALES.has(locale) ? 1 : 3;
}

export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfterMs } = rateLimit(`search:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return apiError('Too many requests', 429, 'RATE_LIMITED');
  }

  const { searchParams } = request.nextUrl;
  const rawQ = searchParams.get('q');
  const rawLocale = searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : undefined;

  if (!rawQ || !rawQ.trim()) {
    return apiError('Search query is required', 400, 'VALIDATION_ERROR');
  }

  const q = trimAndLimit(rawQ, 200);
  const minLen = getMinSearchLength(locale);

  if (q.length < minLen) {
    return apiError(`Search query must be at least ${minLen} characters`, 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const hasTranslations = !!locale && locale !== 'en';

  // Parse search words with stricter max
  let words = parseSearchWords(q);
  if (words.length > SEARCH_MAX_WORDS) {
    words = words.slice(0, SEARCH_MAX_WORDS);
  }

  // If all words were filtered (stop words / too short), use the trimmed query as a single term
  const searchTerms = words.length > 0 ? words : [q.trim().toLowerCase()];

  // Build issue search SQL
  const issueArgs: (string | number)[] = [];
  let issueWhere = "status = 'active'";
  for (const word of searchTerms) {
    const escaped = escapeLike(word);
    const branches: string[] = [
      "name LIKE ? ESCAPE '\\'",
      "id IN (SELECT issue_id FROM synonyms WHERE term LIKE ? ESCAPE '\\')",
    ];
    issueArgs.push(`%${escaped}%`, `%${escaped}%`);

    if (hasTranslations) {
      branches.push(
        "id IN (SELECT entity_id FROM translations WHERE entity_type = 'issue'" +
          " AND field = 'name' AND language_code = ? AND value LIKE ? ESCAPE '\\')",
      );
      branches.push(
        'id IN (SELECT issue_id FROM synonyms WHERE id IN (' +
          "SELECT entity_id FROM translations WHERE entity_type = 'synonym'" +
          " AND field = 'term' AND language_code = ? AND value LIKE ? ESCAPE '\\'))",
      );
      issueArgs.push(locale!, `%${escaped}%`, locale!, `%${escaped}%`);
    }

    issueWhere += ' AND (' + branches.join(' OR ') + ')';
  }
  const issueSql = `SELECT * FROM issues WHERE ${issueWhere} ORDER BY rioter_count DESC LIMIT ${RESULTS_PER_TYPE}`;

  // Build org search SQL
  const orgArgs: (string | number)[] = [];
  let orgWhere = "status = 'active'";
  for (const word of searchTerms) {
    const escaped = escapeLike(word);
    const branches: string[] = ["name LIKE ? ESCAPE '\\'"];
    orgArgs.push(`%${escaped}%`);

    if (hasTranslations) {
      branches.push(
        "id IN (SELECT entity_id FROM translations WHERE entity_type = 'organisation'" +
          " AND field = 'name' AND language_code = ? AND value LIKE ? ESCAPE '\\')",
      );
      orgArgs.push(locale!, `%${escaped}%`);
    }

    orgWhere += ' AND (' + branches.join(' OR ') + ')';
  }
  const orgSql = `SELECT * FROM organisations WHERE ${orgWhere} ORDER BY name LIMIT ${RESULTS_PER_TYPE}`;

  try {
    const [issueResult, orgResult] = await withTimeout(
      () =>
        db.batch([
          { sql: issueSql, args: issueArgs },
          { sql: orgSql, args: orgArgs },
        ]),
      3000,
    );

    let issues = issueResult.rows as unknown as Issue[];
    let organisations = orgResult.rows as unknown as Organisation[];

    // Translate results if non-English locale
    if (locale && locale !== 'en') {
      [issues, organisations] = await Promise.all([
        translateEntities(issues, 'issue', locale),
        translateEntities(organisations, 'organisation', locale),
      ]);
    }

    const response = apiOk({ issues, organisations });
    response.headers.set('Cache-Control', 'public, s-maxage=30');
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      return apiError('Search timed out', 504, 'INTERNAL_ERROR');
    }
    throw error;
  }
}
