import type { InValue } from '@libsql/client';
import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { BotEvent } from '@/types';

export interface TrackBotEventParams {
  action: string;
  userId?: string | null;
  issueId?: string | null;
  durationMs?: number | null;
  status?: 'ok' | 'error';
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Record a bot event. Fire-and-forget — callers should not await this
 * in the request path. Errors are swallowed to avoid breaking bot responses.
 */
export async function trackBotEvent(params: TrackBotEventParams): Promise<void> {
  try {
    const db = getDb();
    const id = generateId();
    await db.execute({
      sql: `INSERT INTO bot_events (id, action, user_id, issue_id, duration_ms, status, error_message, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        params.action,
        params.userId ?? null,
        params.issueId ?? null,
        params.durationMs ?? null,
        params.status ?? 'ok',
        params.errorMessage ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ],
    });
  } catch {
    // Swallow — analytics should never break the bot
  }
}

/**
 * Get bot event counts grouped by action, optionally filtered by date range.
 */
export async function getBotEventCounts(
  since?: string,
): Promise<Array<{ action: string; count: number }>> {
  const db = getDb();
  const sql = since
    ? `SELECT action, COUNT(*) as count FROM bot_events WHERE created_at >= ? GROUP BY action ORDER BY count DESC`
    : `SELECT action, COUNT(*) as count FROM bot_events GROUP BY action ORDER BY count DESC`;
  const args = since ? [since] : [];
  const result = await db.execute({ sql, args });
  return result.rows as unknown as Array<{ action: string; count: number }>;
}

/**
 * Get recent bot events, optionally filtered by action or user.
 */
export async function getRecentBotEvents(options?: {
  action?: string;
  userId?: string;
  limit?: number;
}): Promise<BotEvent[]> {
  const db = getDb();
  const conditions: string[] = [];
  const args: InValue[] = [];

  if (options?.action) {
    conditions.push('action = ?');
    args.push(options.action);
  }
  if (options?.userId) {
    conditions.push('user_id = ?');
    args.push(options.userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options?.limit ?? 50;
  args.push(limit);

  const result = await db.execute({
    sql: `SELECT * FROM bot_events ${where} ORDER BY created_at DESC LIMIT ?`,
    args,
  });
  return result.rows as unknown as BotEvent[];
}

/**
 * Get daily active users (unique user_ids per day) for the last N days.
 */
export async function getBotDailyActiveUsers(
  days: number = 7,
): Promise<Array<{ date: string; unique_users: number }>> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT date(created_at) as date, COUNT(DISTINCT user_id) as unique_users
          FROM bot_events
          WHERE user_id IS NOT NULL AND created_at >= date('now', '-' || ? || ' days')
          GROUP BY date(created_at)
          ORDER BY date DESC`,
    args: [days],
  });
  return result.rows as unknown as Array<{ date: string; unique_users: number }>;
}
