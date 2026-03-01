import { getDb } from '../db';
import type { ActivityItem, PersonalFeedResult } from '@/types';

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 20;

/**
 * Parse a compound cursor in format `{iso_datetime}_{id}`.
 * Returns null if the cursor is invalid.
 */
export function parseCursor(cursor: string): { createdAt: string; id: string } | null {
  const separatorIndex = cursor.lastIndexOf('_');
  if (separatorIndex === -1) return null;

  const createdAt = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);

  if (!createdAt || !id) return null;
  return { createdAt, id };
}

/**
 * Build a compound cursor from an activity item.
 */
function buildCursor(item: ActivityItem): string {
  return `${item.created_at}_${item.activity_id}`;
}

/**
 * Get a personalised activity feed for a user based on their joined and followed issues.
 * UNION ALL across feed, evidence, and riot_reels tables with cursor pagination.
 */
export async function getPersonalFeed(
  userId: string,
  cursor?: string,
  limit: number = DEFAULT_LIMIT,
): Promise<PersonalFeedResult> {
  const db = getDb();
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  // Fetch one extra to detect if there's a next page
  const fetchLimit = safeLimit + 1;

  const parsed = cursor ? parseCursor(cursor) : null;

  // The subquery for user's issues (joined + followed)
  const issueSubquery = `(
    SELECT issue_id FROM user_issues WHERE user_id = ?1
    UNION
    SELECT issue_id FROM user_follows WHERE user_id = ?1
  )`;

  // Build the cursor WHERE clause
  const cursorClause = parsed
    ? `AND (sub.created_at < ?2 OR (sub.created_at = ?2 AND sub.activity_id < ?3))`
    : '';

  const sql = `
    SELECT * FROM (
      SELECT
        'feed_post' AS activity_type,
        f.id AS activity_id,
        f.issue_id,
        i.name AS issue_name,
        COALESCE(u.name, 'Anonymous') AS user_name,
        SUBSTR(f.content, 1, 200) AS content_snippet,
        f.created_at,
        f.likes,
        0 AS comments_count,
        0 AS shares,
        NULL AS media_url,
        NULL AS media_type,
        '/issues/' || f.issue_id AS detail_url
      FROM feed f
      JOIN issues i ON f.issue_id = i.id
      JOIN users u ON f.user_id = u.id
      WHERE f.issue_id IN ${issueSubquery}

      UNION ALL

      SELECT
        'evidence' AS activity_type,
        e.id AS activity_id,
        e.issue_id,
        i.name AS issue_name,
        COALESCE(u.name, 'Anonymous') AS user_name,
        SUBSTR(e.content, 1, 200) AS content_snippet,
        e.created_at,
        e.likes,
        e.comments_count,
        e.shares,
        CASE
          WHEN e.media_type IN ('photo', 'video') AND e.photo_urls IS NOT NULL AND e.photo_urls != '[]' THEN e.photo_urls
          WHEN e.media_type = 'video' AND e.video_url IS NOT NULL THEN e.video_url
          ELSE NULL
        END AS media_url,
        CASE
          WHEN e.media_type = 'photo' THEN 'image'
          WHEN e.media_type = 'video' THEN 'video'
          ELSE NULL
        END AS media_type,
        '/issues/' || e.issue_id AS detail_url
      FROM evidence e
      JOIN issues i ON e.issue_id = i.id
      JOIN users u ON e.user_id = u.id
      WHERE e.issue_id IN ${issueSubquery}

      UNION ALL

      SELECT
        'riot_reel' AS activity_type,
        r.id AS activity_id,
        r.issue_id,
        i.name AS issue_name,
        COALESCE(u.name, 'Quiet Riots') AS user_name,
        SUBSTR(r.title, 1, 200) AS content_snippet,
        r.created_at,
        r.upvotes AS likes,
        0 AS comments_count,
        0 AS shares,
        r.thumbnail_url AS media_url,
        'video' AS media_type,
        '/issues/' || r.issue_id AS detail_url
      FROM riot_reels r
      JOIN issues i ON r.issue_id = i.id
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE r.issue_id IN ${issueSubquery}
        AND r.status IN ('approved', 'featured')
    ) sub
    WHERE 1=1 ${cursorClause}
    ORDER BY sub.created_at DESC, sub.activity_id DESC
    LIMIT ?
  `;

  // Build args: ?1 = userId (used in subquery), then cursor args, then limit
  const args: (string | number)[] = [userId];
  if (parsed) {
    args.push(parsed.createdAt); // ?2
    args.push(parsed.id); // ?3
  }
  args.push(fetchLimit);

  const result = await db.execute({ sql, args });
  const rows = result.rows as unknown as ActivityItem[];

  const hasMore = rows.length > safeLimit;
  const items = hasMore ? rows.slice(0, safeLimit) : rows;
  const nextCursor = hasMore ? buildCursor(items[items.length - 1]) : null;

  return {
    activities: items,
    next_cursor: nextCursor,
  };
}

/**
 * Count recent activity items for a user since a given timestamp.
 * Used by the `identify` bot action.
 */
export async function getRecentActivityCount(
  userId: string,
  since: string,
): Promise<number> {
  const db = getDb();

  const issueSubquery = `(
    SELECT issue_id FROM user_issues WHERE user_id = ?
    UNION
    SELECT issue_id FROM user_follows WHERE user_id = ?
  )`;

  const sql = `
    SELECT (
      (SELECT COUNT(*) FROM feed WHERE issue_id IN ${issueSubquery} AND created_at > ?) +
      (SELECT COUNT(*) FROM evidence WHERE issue_id IN ${issueSubquery} AND created_at > ?) +
      (SELECT COUNT(*) FROM riot_reels WHERE issue_id IN ${issueSubquery} AND created_at > ? AND status IN ('approved', 'featured'))
    ) AS total
  `;

  const result = await db.execute({
    sql,
    args: [userId, userId, since, userId, userId, since, userId, userId, since],
  });

  return Number((result.rows[0] as unknown as { total: number }).total);
}
