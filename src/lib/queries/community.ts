import { getDb } from '../db';
import type { CommunityHealth, ExpertProfile, FeedPost, CountryBreakdown } from '@/types';

export async function getCommunityHealth(issueId: number): Promise<CommunityHealth | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM community_health WHERE issue_id = ?',
    args: [issueId],
  });
  return (result.rows[0] as unknown as CommunityHealth) ?? null;
}

export async function getExpertProfiles(issueId: number): Promise<ExpertProfile[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM expert_profiles WHERE issue_id = ?',
    args: [issueId],
  });
  return result.rows as unknown as ExpertProfile[];
}

export async function getFeedPosts(issueId: number, limit: number = 20): Promise<FeedPost[]> {
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
  issueId: number,
  userId: number,
  content: string,
): Promise<FeedPost> {
  const db = getDb();
  const insertResult = await db.execute({
    sql: 'INSERT INTO feed (issue_id, user_id, content) VALUES (?, ?, ?)',
    args: [issueId, userId, content],
  });

  const result = await db.execute({
    sql: `
    SELECT f.*, u.name as user_name
    FROM feed f
    JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
  `,
    args: [Number(insertResult.lastInsertRowid)],
  });
  return result.rows[0] as unknown as FeedPost;
}

export async function likeFeedPost(postId: number): Promise<void> {
  const db = getDb();
  await db.execute({ sql: 'UPDATE feed SET likes = likes + 1 WHERE id = ?', args: [postId] });
}

export async function getCountryBreakdown(issueId: number): Promise<CountryBreakdown[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM country_breakdown WHERE issue_id = ? ORDER BY rioter_count DESC',
    args: [issueId],
  });
  return result.rows as unknown as CountryBreakdown[];
}
