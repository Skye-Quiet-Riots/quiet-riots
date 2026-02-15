import { getDb } from '../db';
import type { CommunityHealth, ExpertProfile, FeedPost, CountryBreakdown } from '@/types';

export function getCommunityHealth(issueId: number): CommunityHealth | null {
  const db = getDb();
  return db.prepare('SELECT * FROM community_health WHERE issue_id = ?').get(issueId) as CommunityHealth | null;
}

export function getExpertProfiles(issueId: number): ExpertProfile[] {
  const db = getDb();
  return db.prepare('SELECT * FROM expert_profiles WHERE issue_id = ?').all(issueId) as ExpertProfile[];
}

export function getFeedPosts(issueId: number, limit: number = 20): FeedPost[] {
  const db = getDb();
  return db.prepare(`
    SELECT f.*, u.name as user_name
    FROM feed f
    JOIN users u ON f.user_id = u.id
    WHERE f.issue_id = ?
    ORDER BY f.created_at DESC
    LIMIT ?
  `).all(issueId, limit) as FeedPost[];
}

export function createFeedPost(issueId: number, userId: number, content: string): FeedPost {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO feed (issue_id, user_id, content) VALUES (?, ?, ?)'
  ).run(issueId, userId, content);

  return db.prepare(`
    SELECT f.*, u.name as user_name
    FROM feed f
    JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
  `).get(result.lastInsertRowid) as FeedPost;
}

export function likeFeedPost(postId: number): void {
  const db = getDb();
  db.prepare('UPDATE feed SET likes = likes + 1 WHERE id = ?').run(postId);
}

export function getCountryBreakdown(issueId: number): CountryBreakdown[] {
  const db = getDb();
  return db.prepare('SELECT * FROM country_breakdown WHERE issue_id = ? ORDER BY rioter_count DESC').all(issueId) as CountryBreakdown[];
}
