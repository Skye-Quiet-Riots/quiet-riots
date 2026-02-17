import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { CommunityHealth, ExpertProfile, FeedPost, CountryBreakdown } from '@/types';

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
    SELECT f.*, u.name as user_name
    FROM feed f
    JOIN users u ON f.user_id = u.id
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
): Promise<FeedPost> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)',
    args: [id, issueId, userId, content],
  });

  const result = await db.execute({
    sql: `
    SELECT f.*, u.name as user_name
    FROM feed f
    JOIN users u ON f.user_id = u.id
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

export async function getCountryBreakdown(issueId: string): Promise<CountryBreakdown[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM country_breakdown WHERE issue_id = ? ORDER BY rioter_count DESC',
    args: [issueId],
  });
  return result.rows as unknown as CountryBreakdown[];
}
