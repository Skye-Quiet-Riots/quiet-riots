import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { CommunityHealth, ExpertProfile, FeedPost, FeedComment, CountryBreakdown } from '@/types';

export async function getCommunityHealth(issueId: string): Promise<CommunityHealth | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM community_health WHERE issue_id = ?',
    args: [issueId],
  });
  return (result.rows[0] as unknown as CommunityHealth) ?? null;
}

export async function getExpertProfiles(issueId: string): Promise<ExpertProfile[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM expert_profiles WHERE issue_id = ?',
    args: [issueId],
  });
  return result.rows as unknown as ExpertProfile[];
}

export async function getFeedPosts(issueId: string, limit: number = 20): Promise<FeedPost[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT f.*, COALESCE(u.display_name, u.name, 'Anonymous') as user_name,
           u.avatar_url as user_avatar, u.country_code as user_country_code
    FROM feed f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.issue_id = ?
    ORDER BY f.created_at DESC
    LIMIT ?
  `,
    args: [issueId, limit],
  });
  return result.rows as unknown as FeedPost[];
}

export async function createFeedPost(
  issueId: string,
  userId: string,
  content: string,
  photoUrls: string = '[]',
): Promise<FeedPost> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO feed (id, issue_id, user_id, content, photo_urls) VALUES (?, ?, ?, ?, ?)',
    args: [id, issueId, userId, content, photoUrls],
  });

  const result = await db.execute({
    sql: `
    SELECT f.*, COALESCE(u.display_name, u.name, 'Anonymous') as user_name,
           u.avatar_url as user_avatar, u.country_code as user_country_code
    FROM feed f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
  `,
    args: [id],
  });
  return result.rows[0] as unknown as FeedPost;
}

export async function likeFeedPost(postId: string): Promise<void> {
  const db = getDb();
  await db.execute({ sql: 'UPDATE feed SET likes = likes + 1 WHERE id = ?', args: [postId] });
}

export async function getUserFeedPostCount(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM feed WHERE user_id = ?',
    args: [userId],
  });
  return Number(result.rows[0]?.count ?? 0);
}

export async function getUserTotalLikes(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COALESCE(SUM(likes), 0) as total FROM feed WHERE user_id = ?',
    args: [userId],
  });
  return Number(result.rows[0]?.total ?? 0);
}

export async function shareFeedPost(postId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE feed SET shares = shares + 1 WHERE id = ?',
    args: [postId],
  });
}

export async function getFeedComments(
  feedId: string,
  limit: number = 20,
): Promise<FeedComment[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT fc.*, u.name as user_name
          FROM feed_comments fc
          JOIN users u ON fc.user_id = u.id
          WHERE fc.feed_id = ?
          ORDER BY fc.created_at ASC
          LIMIT ?`,
    args: [feedId, limit],
  });
  return result.rows as unknown as FeedComment[];
}

export async function addFeedComment(
  feedId: string,
  userId: string,
  content: string,
): Promise<FeedComment> {
  const db = getDb();
  const id = generateId();

  // Resolve user_name for the denormalized column
  const userResult = await db.execute({
    sql: 'SELECT COALESCE(display_name, name, ?) as resolved_name FROM users WHERE id = ?',
    args: ['Anonymous', userId],
  });
  const userName = String(userResult.rows[0]?.resolved_name ?? 'Anonymous');

  // Atomic: insert comment + increment counter
  await db.batch([
    {
      sql: 'INSERT INTO feed_comments (id, feed_id, user_id, user_name, content) VALUES (?, ?, ?, ?, ?)',
      args: [id, feedId, userId, userName, content],
    },
    {
      sql: 'UPDATE feed SET comments_count = comments_count + 1 WHERE id = ?',
      args: [feedId],
    },
  ]);

  const result = await db.execute({
    sql: `SELECT fc.*, u.name as user_name
          FROM feed_comments fc
          JOIN users u ON fc.user_id = u.id
          WHERE fc.id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as FeedComment;
}

export async function getCountryBreakdown(issueId: string): Promise<CountryBreakdown[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM country_breakdown WHERE issue_id = ? ORDER BY rioter_count DESC',
    args: [issueId],
  });
  return result.rows as unknown as CountryBreakdown[];
}

// ─── Org-scoped queries (Phase 6) ─────────────────────────────────

/**
 * Weighted average community health across all issues linked to an org.
 * Returns a CommunityHealth-compatible object with all 4 metrics.
 * Weighted by rioter_count in issue_organisation (larger issues have more influence).
 * Falls back to simple average if all linked issues have rioter_count = 0.
 */
export async function getCommunityHealthForOrg(
  orgId: string,
): Promise<CommunityHealth | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT
        CASE WHEN SUM(io.rioter_count) > 0
          THEN CAST(SUM(ch.needs_met * io.rioter_count) AS REAL) / SUM(io.rioter_count)
          ELSE AVG(ch.needs_met)
        END as needs_met,
        CASE WHEN SUM(io.rioter_count) > 0
          THEN CAST(SUM(ch.membership * io.rioter_count) AS REAL) / SUM(io.rioter_count)
          ELSE AVG(ch.membership)
        END as membership,
        CASE WHEN SUM(io.rioter_count) > 0
          THEN CAST(SUM(ch.influence * io.rioter_count) AS REAL) / SUM(io.rioter_count)
          ELSE AVG(ch.influence)
        END as influence,
        CASE WHEN SUM(io.rioter_count) > 0
          THEN CAST(SUM(ch.connection * io.rioter_count) AS REAL) / SUM(io.rioter_count)
          ELSE AVG(ch.connection)
        END as connection,
        COUNT(*) as issue_count
      FROM issue_organisation io
      JOIN community_health ch ON ch.issue_id = io.issue_id
      WHERE io.organisation_id = ?
    `,
    args: [orgId],
  });
  const row = result.rows[0];
  if (!row || Number(row.issue_count) === 0) return null;
  return {
    id: `org-health-${orgId}`,
    issue_id: orgId,
    needs_met: Math.round(Number(row.needs_met)),
    membership: Math.round(Number(row.membership)),
    influence: Math.round(Number(row.influence)),
    connection: Math.round(Number(row.connection)),
  } as CommunityHealth;
}

/**
 * Feed posts from all issues linked to an org, ordered by recency.
 */
export async function getFeedPostsForOrg(
  orgId: string,
  limit: number = 20,
): Promise<FeedPost[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT f.*, COALESCE(u.display_name, u.name, 'Anonymous') as user_name,
             u.avatar_url as user_avatar, u.country_code as user_country_code
      FROM feed f
      LEFT JOIN users u ON f.user_id = u.id
      JOIN issue_organisation io ON io.issue_id = f.issue_id
      WHERE io.organisation_id = ?
      ORDER BY f.created_at DESC
      LIMIT ?
    `,
    args: [orgId, limit],
  });
  return result.rows as unknown as FeedPost[];
}

/**
 * Expert profiles from all issues linked to an org.
 */
export async function getExpertsForOrg(orgId: string): Promise<ExpertProfile[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT ep.*
      FROM expert_profiles ep
      JOIN issue_organisation io ON io.issue_id = ep.issue_id
      WHERE io.organisation_id = ?
    `,
    args: [orgId],
  });
  return result.rows as unknown as ExpertProfile[];
}

/**
 * Aggregated country breakdown across all issues linked to an org.
 * Sums rioter_count per country across all linked issues.
 */
export async function getCountryBreakdownForOrg(orgId: string): Promise<CountryBreakdown[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT cb.country_code, cb.country_name,
        SUM(cb.rioter_count) as rioter_count,
        MAX(cb.issue_id) as issue_id
      FROM country_breakdown cb
      JOIN issue_organisation io ON io.issue_id = cb.issue_id
      WHERE io.organisation_id = ?
      GROUP BY cb.country_code, cb.country_name
      ORDER BY SUM(cb.rioter_count) DESC
    `,
    args: [orgId],
  });
  return result.rows as unknown as CountryBreakdown[];
}
