import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { RiotReel } from '@/types';

export async function getReelsForIssue(issueId: string, limit = 20): Promise<RiotReel[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM riot_reels
          WHERE issue_id = ? AND status IN ('approved', 'featured')
          ORDER BY upvotes DESC
          LIMIT ?`,
    args: [issueId, limit],
  });
  return result.rows as unknown as RiotReel[];
}

export async function getReelById(reelId: string): Promise<RiotReel | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM riot_reels WHERE id = ?',
    args: [reelId],
  });
  return (result.rows[0] as unknown as RiotReel) ?? null;
}

export async function createReel(data: {
  issueId: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  caption: string;
  submittedBy: string | null;
  source: 'curated' | 'community' | 'ai_suggested';
  status?: 'pending' | 'approved' | 'featured';
}): Promise<RiotReel> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, thumbnail_url, duration_seconds, caption, submitted_by, source, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.issueId,
      data.youtubeUrl,
      data.youtubeVideoId,
      data.title,
      data.thumbnailUrl,
      data.durationSeconds,
      data.caption,
      data.submittedBy,
      data.source,
      data.status ?? 'pending',
    ],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM riot_reels WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as RiotReel;
}

export async function voteOnReel(reelId: string, userId: string): Promise<void> {
  const db = getDb();
  // Insert vote (ignore if already voted)
  const result = await db.execute({
    sql: 'INSERT OR IGNORE INTO reel_votes (reel_id, user_id) VALUES (?, ?)',
    args: [reelId, userId],
  });
  // Only increment if this was a new vote
  if (result.rowsAffected > 0) {
    await db.execute({
      sql: 'UPDATE riot_reels SET upvotes = upvotes + 1 WHERE id = ?',
      args: [reelId],
    });
  }
}

export async function hasVoted(reelId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM reel_votes WHERE reel_id = ? AND user_id = ?',
    args: [reelId, userId],
  });
  return result.rows.length > 0;
}

export async function getTrendingReels(limit = 10): Promise<(RiotReel & { issue_name: string })[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT r.*, i.name as issue_name
          FROM riot_reels r
          JOIN issues i ON r.issue_id = i.id
          WHERE r.status IN ('approved', 'featured')
            AND r.created_at >= datetime('now', '-7 days')
          ORDER BY r.upvotes DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as (RiotReel & { issue_name: string })[];
}

export async function getUnseenReelForUser(
  issueId: string,
  userId: string,
): Promise<RiotReel | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM riot_reels
          WHERE issue_id = ? AND status IN ('approved', 'featured')
            AND id NOT IN (SELECT reel_id FROM reel_shown_log WHERE user_id = ?)
          ORDER BY RANDOM()
          LIMIT 1`,
    args: [issueId, userId],
  });
  return (result.rows[0] as unknown as RiotReel) ?? null;
}

export async function logReelShown(userId: string, reelId: string, issueId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'INSERT INTO reel_shown_log (user_id, reel_id, issue_id) VALUES (?, ?, ?)',
    args: [userId, reelId, issueId],
  });
}

export async function incrementReelViews(reelId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE riot_reels SET views = views + 1 WHERE id = ?',
    args: [reelId],
  });
}
