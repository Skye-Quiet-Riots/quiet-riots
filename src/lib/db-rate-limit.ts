/**
 * DB-backed rate limiter for serverless environments.
 * Unlike the in-memory rate limiter, this persists across cold starts.
 * Use for production-critical paths like OTP requests and password auth.
 *
 * The `identifier` parameter is generic — can be a phone number, email,
 * IP address, or any string that uniquely identifies the rate-limited entity.
 */

import { getDb } from './db';

interface DbRateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  count: number;
}

/**
 * Check and increment rate limit counter in the database.
 * Returns whether the action is allowed.
 */
export async function checkDbRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<DbRateLimitResult> {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs).toISOString();

  // Check if locked
  const lockResult = await db.execute({
    sql: 'SELECT locked_until FROM rate_limits WHERE identifier = ? AND action = ?',
    args: [identifier, action],
  });

  if (lockResult.rows.length > 0) {
    const lockedUntil = lockResult.rows[0].locked_until as string | null;
    if (lockedUntil && new Date(lockedUntil) > now) {
      const retryAfterMs = new Date(lockedUntil).getTime() - now.getTime();
      return { allowed: false, retryAfterMs, count: maxRequests };
    }
  }

  // Check if within window and under limit
  const existing = await db.execute({
    sql: 'SELECT count, window_start FROM rate_limits WHERE identifier = ? AND action = ?',
    args: [identifier, action],
  });

  if (existing.rows.length === 0) {
    // First request — create entry
    await db.execute({
      sql: `INSERT INTO rate_limits (id, identifier, action, count, window_start)
            VALUES (lower(hex(randomblob(16))), ?, ?, 1, ?)`,
      args: [identifier, action, now.toISOString()],
    });
    return { allowed: true, retryAfterMs: 0, count: 1 };
  }

  const row = existing.rows[0];
  const rowWindowStart = row.window_start as string;
  const count = row.count as number;

  // If window has expired, reset counter
  if (new Date(rowWindowStart) < new Date(windowStart)) {
    await db.execute({
      sql: 'UPDATE rate_limits SET count = 1, window_start = ?, locked_until = NULL WHERE identifier = ? AND action = ?',
      args: [now.toISOString(), identifier, action],
    });
    return { allowed: true, retryAfterMs: 0, count: 1 };
  }

  // Within window — check limit
  if (count >= maxRequests) {
    const windowStartTime = new Date(rowWindowStart).getTime();
    const retryAfterMs = windowStartTime + windowMs - now.getTime();
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs), count };
  }

  // Increment counter
  await db.execute({
    sql: 'UPDATE rate_limits SET count = count + 1 WHERE identifier = ? AND action = ?',
    args: [identifier, action],
  });

  return { allowed: true, retryAfterMs: 0, count: count + 1 };
}

/**
 * Set a lockout on an identifier+action until a specific time.
 */
export async function setDbRateLimitLock(
  identifier: string,
  action: string,
  lockDurationMs: number,
): Promise<void> {
  const db = getDb();
  const lockedUntil = new Date(Date.now() + lockDurationMs).toISOString();

  const existing = await db.execute({
    sql: 'SELECT 1 FROM rate_limits WHERE identifier = ? AND action = ?',
    args: [identifier, action],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO rate_limits (id, identifier, action, count, window_start, locked_until)
            VALUES (lower(hex(randomblob(16))), ?, ?, 0, ?, ?)`,
      args: [identifier, action, new Date().toISOString(), lockedUntil],
    });
  } else {
    await db.execute({
      sql: 'UPDATE rate_limits SET locked_until = ? WHERE identifier = ? AND action = ?',
      args: [lockedUntil, identifier, action],
    });
  }
}

/** Clear rate limit entries for testing. */
export async function _resetDbRateLimits(): Promise<void> {
  const db = getDb();
  await db.execute('DELETE FROM rate_limits');
}
