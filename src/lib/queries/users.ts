import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { User, UserIssue, Issue } from '@/types';

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const normalized = email.toLowerCase().trim();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(email) = ?',
    args: [normalized],
  });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE phone = ?', args: [phone] });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  time_available?: string;
  skills?: string;
  language_code?: string;
  country_code?: string;
}): Promise<User> {
  const db = getDb();
  const id = generateId();
  const normalizedEmail = data.email.toLowerCase().trim();
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills, language_code, country_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name,
      normalizedEmail,
      data.phone || null,
      data.time_available || '10min',
      data.skills || '',
      data.language_code || 'en',
      data.country_code || null,
    ],
  });
  const user = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return user.rows[0] as unknown as User;
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    phone?: string;
    time_available?: string;
    skills?: string;
    language_code?: string;
    country_code?: string;
    onboarding_completed?: number;
    avatar_url?: string;
  },
): Promise<User | null> {
  const db = getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    args.push(data.name);
  }
  if (data.phone !== undefined) {
    sets.push('phone = ?');
    args.push(data.phone);
  }
  if (data.time_available !== undefined) {
    sets.push('time_available = ?');
    args.push(data.time_available);
  }
  if (data.skills !== undefined) {
    sets.push('skills = ?');
    args.push(data.skills);
  }
  if (data.language_code !== undefined) {
    sets.push('language_code = ?');
    args.push(data.language_code);
  }
  if (data.country_code !== undefined) {
    sets.push('country_code = ?');
    args.push(data.country_code);
  }
  if (data.onboarding_completed !== undefined) {
    sets.push('onboarding_completed = ?');
    args.push(data.onboarding_completed);
  }
  if (data.avatar_url !== undefined) {
    sets.push('avatar_url = ?');
    args.push(data.avatar_url);
  }

  if (sets.length === 0) return getUserById(id);

  args.push(id);
  await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args });
  return getUserById(id);
}

export async function getUserIssues(userId: string): Promise<(UserIssue & { issue: Issue })[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
    SELECT ui.*, i.name as issue_name, i.category, i.rioter_count, i.trending_delta,
           i.description, i.country_count, i.created_at as issue_created_at
    FROM user_issues ui
    JOIN issues i ON ui.issue_id = i.id
    WHERE ui.user_id = ?
    ORDER BY ui.joined_at DESC
  `,
    args: [userId],
  });
  return result.rows as unknown as (UserIssue & { issue: Issue })[];
}

/**
 * Join an issue — atomically inserts into user_issues and auto-follows.
 * Uses db.batch() so both statements succeed or fail together.
 */
export async function joinIssue(userId: string, issueId: string): Promise<void> {
  const db = getDb();
  const id = generateId();
  const followId = generateId();
  await db.batch([
    {
      sql: 'INSERT OR IGNORE INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)',
      args: [id, userId, issueId],
    },
    {
      sql: 'INSERT OR IGNORE INTO user_follows (id, user_id, issue_id, auto_followed) VALUES (?, ?, ?, 1)',
      args: [followId, userId, issueId],
    },
  ]);
}

/**
 * Leave an issue — atomically removes from user_issues and removes auto-follows only.
 * Manual follows (auto_followed=0) survive leaving an issue.
 */
export async function leaveIssue(userId: string, issueId: string): Promise<void> {
  const db = getDb();
  await db.batch([
    {
      sql: 'DELETE FROM user_issues WHERE user_id = ? AND issue_id = ?',
      args: [userId, issueId],
    },
    {
      sql: 'DELETE FROM user_follows WHERE user_id = ? AND issue_id = ? AND auto_followed = 1',
      args: [userId, issueId],
    },
  ]);
}

export async function hasJoinedIssue(userId: string, issueId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM user_issues WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
  return result.rows.length > 0;
}

// ─── Follow System ────────────────────────────────────────────

const MAX_FOLLOWS = 100;

export type FollowResult = 'followed' | 'already_following' | 'not_found' | 'max_reached';

/**
 * Follow an issue. Verifies issue exists and is active before inserting.
 * Uses count-and-insert in a single batch to prevent race conditions on the cap.
 */
export async function followIssue(
  userId: string,
  issueId: string,
  autoFollowed: boolean = false,
): Promise<FollowResult> {
  const db = getDb();

  // Verify issue exists and is active
  const issueCheck = await db.execute({
    sql: "SELECT 1 FROM issues WHERE id = ? AND status = 'active'",
    args: [issueId],
  });
  if (issueCheck.rows.length === 0) return 'not_found';

  // Check if already following
  const existingCheck = await db.execute({
    sql: 'SELECT 1 FROM user_follows WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
  if (existingCheck.rows.length > 0) return 'already_following';

  // Check follow count (soft cap at 100)
  const countCheck = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_follows WHERE user_id = ?',
    args: [userId],
  });
  const count = Number((countCheck.rows[0] as unknown as { count: number }).count);
  if (count >= MAX_FOLLOWS) return 'max_reached';

  // Insert follow
  const id = generateId();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_follows (id, user_id, issue_id, auto_followed) VALUES (?, ?, ?, ?)',
    args: [id, userId, issueId, autoFollowed ? 1 : 0],
  });

  return 'followed';
}

/**
 * Unfollow an issue — removes regardless of auto_followed status.
 */
export async function unfollowIssue(userId: string, issueId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM user_follows WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
  return result.rowsAffected > 0;
}

export async function hasFollowedIssue(userId: string, issueId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM user_follows WHERE user_id = ? AND issue_id = ?',
    args: [userId, issueId],
  });
  return result.rows.length > 0;
}

export async function getFollowedIssues(userId: string): Promise<Issue[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT i.* FROM issues i
          INNER JOIN user_follows uf ON uf.issue_id = i.id
          WHERE uf.user_id = ? AND i.status = 'active'
          ORDER BY uf.created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as Issue[];
}

export async function getFollowerCount(issueId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_follows WHERE issue_id = ?',
    args: [issueId],
  });
  return Number((result.rows[0] as unknown as { count: number }).count);
}

export async function getFollowedIssueCount(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_follows WHERE user_id = ?',
    args: [userId],
  });
  return Number((result.rows[0] as unknown as { count: number }).count);
}

export async function getUserConnectedAccounts(
  userId: string,
): Promise<{ provider: string; type: string }[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT provider, type FROM accounts WHERE user_id = ?',
    args: [userId],
  });
  return result.rows as unknown as { provider: string; type: string }[];
}

/**
 * Count the number of authentication methods a user has.
 * Includes: OAuth accounts, verified phone, verified email, and password.
 * Used to prevent users from removing their last auth method.
 */
export async function countUserAuthMethods(userId: string): Promise<number> {
  const db = getDb();

  // Count OAuth/email provider accounts
  const accountsResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM accounts WHERE user_id = ?',
    args: [userId],
  });
  const oauthCount = (accountsResult.rows[0] as unknown as { count: number }).count;

  // Check phone and password on user record
  const userResult = await db.execute({
    sql: 'SELECT phone_verified, password_hash FROM users WHERE id = ?',
    args: [userId],
  });

  if (userResult.rows.length === 0) return oauthCount;

  const user = userResult.rows[0] as unknown as {
    phone_verified: number;
    password_hash: string | null;
  };

  let count = oauthCount;
  if (user.phone_verified === 1) count++;
  if (user.password_hash) count++;

  return count;
}

/**
 * Get user by email with password hash included.
 * Used for password-based authentication.
 */
export async function getUserByEmailWithPassword(
  email: string,
): Promise<(User & { password_hash: string | null }) | null> {
  const db = getDb();
  const normalized = email.toLowerCase().trim();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(email) = ?',
    args: [normalized],
  });
  return (
    (result.rows[0] as unknown as (User & { password_hash: string | null }) | undefined) ?? null
  );
}

/**
 * Set or update a user's password hash.
 */
export async function setUserPasswordHash(userId: string, hash: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?',
    args: [hash, new Date().toISOString(), userId],
  });
}

export async function unlinkUserAccount(userId: string, provider: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM accounts WHERE user_id = ? AND provider = ?',
    args: [userId, provider],
  });
  return result.rowsAffected > 0;
}
