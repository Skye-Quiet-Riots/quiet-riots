/**
 * DB-backed rate limiter for serverless environments.
 * Unlike the in-memory rate limiter, this persists across cold starts.
 * Use for production-critical paths like OTP requests.
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
  phone: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<DbRateLimitResult> {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs).toISOString();

  // Check if locked
  const lockResult = await db.execute({
    sql: 'SELECT locked_until FROM phone_rate_limits WHERE phone = ? AND action = ?',
    args: [phone, action],
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
    sql: 'SELECT count, window_start FROM phone_rate_limits WHERE phone = ? AND action = ?',
    args: [phone, action],
  });

  if (existing.rows.length === 0) {
    // First request — create entry
    await db.execute({
      sql: `INSERT INTO phone_rate_limits (id, phone, action, count, window_start)
            VALUES (lower(hex(randomblob(16))), ?, ?, 1, ?)`,
      args: [phone, action, now.toISOString()],
    });
    return { allowed: true, retryAfterMs: 0, count: 1 };
  }

  const row = existing.rows[0];
  const rowWindowStart = row.window_start as string;
  const count = row.count as number;

  // If window has expired, reset counter
  if (new Date(rowWindowStart) < new Date(windowStart)) {
    await db.execute({
      sql: 'UPDATE phone_rate_limits SET count = 1, window_start = ?, locked_until = NULL WHERE phone = ? AND action = ?',
      args: [now.toISOString(), phone, action],
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
    sql: 'UPDATE phone_rate_limits SET count = count + 1 WHERE phone = ? AND action = ?',
    args: [phone, action],
  });

  return { allowed: true, retryAfterMs: 0, count: count + 1 };
}

/**
 * Set a lockout on a phone+action until a specific time.
 */
export async function setDbRateLimitLock(
  phone: string,
  action: string,
  lockDurationMs: number,
): Promise<void> {
  const db = getDb();
  const lockedUntil = new Date(Date.now() + lockDurationMs).toISOString();

  const existing = await db.execute({
    sql: 'SELECT 1 FROM phone_rate_limits WHERE phone = ? AND action = ?',
    args: [phone, action],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO phone_rate_limits (id, phone, action, count, window_start, locked_until)
            VALUES (lower(hex(randomblob(16))), ?, ?, 0, ?, ?)`,
      args: [phone, action, new Date().toISOString(), lockedUntil],
    });
  } else {
    await db.execute({
      sql: 'UPDATE phone_rate_limits SET locked_until = ? WHERE phone = ? AND action = ?',
      args: [lockedUntil, phone, action],
    });
  }
}

/** Clear rate limit entries for testing. */
export async function _resetDbRateLimits(): Promise<void> {
  const db = getDb();
  await db.execute('DELETE FROM phone_rate_limits');
}
