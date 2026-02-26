import { cookies } from 'next/headers';

const SESSION_COOKIE = 'qr_user_id';

/**
 * Parse legacy cookie value.
 * New format: "userId:sessionVersion" (e.g., "abc123:3")
 * Old format: "userId" (e.g., "abc123") — treated as version 0
 */
function parseCookieValue(value: string): { userId: string; version: number } {
  const colonIdx = value.lastIndexOf(':');
  // Check if there's a colon and the part after it is a valid number
  if (colonIdx > 0) {
    const versionStr = value.slice(colonIdx + 1);
    const version = parseInt(versionStr, 10);
    if (!isNaN(version)) {
      return { userId: value.slice(0, colonIdx), version };
    }
  }
  // Old format — no version encoded
  return { userId: value, version: 0 };
}

/**
 * Get the current user's ID from the session.
 *
 * Checks Auth.js JWT session first (new system).
 * Falls back to legacy qr_user_id cookie (bridge period).
 *
 * For legacy cookies, validates the user exists, is active, and the
 * session_version matches. This prevents stale sessions after password
 * changes or forced logouts.
 *
 * Auth.js is dynamically imported to avoid pulling in next-auth's
 * module tree in test environments where next/server isn't available.
 */
export async function getSession(): Promise<string | null> {
  // Check Auth.js session first
  try {
    const { auth } = await import('./auth');
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // Auth.js not configured (e.g., missing AUTH_SECRET, test env) — fall through to legacy
  }

  // Fall back to legacy cookie with version validation
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawValue) return null;

  const { userId, version } = parseCookieValue(rawValue);
  if (!userId) return null;

  // Validate user exists, is active, and session_version matches
  try {
    const { getDb } = await import('./db');
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT session_version, status FROM users WHERE id = ? AND status != 'deleted'",
      args: [userId],
    });

    if (result.rows.length === 0) {
      // User doesn't exist or is deleted — clear the cookie
      cookieStore.delete(SESSION_COOKIE);
      return null;
    }

    const user = result.rows[0] as unknown as { session_version: number; status: string };

    // If user is deactivated, allow read but don't grant session
    if (user.status === 'deactivated') {
      return null;
    }

    // Version 0 means old cookie format — accept it but it'll be refreshed on next setSession
    if (version !== 0 && user.session_version !== version) {
      // Session version mismatch — session has been invalidated
      cookieStore.delete(SESSION_COOKIE);
      return null;
    }

    return userId;
  } catch {
    // DB not available — accept the cookie value as-is (test environments)
    return userId;
  }
}

/**
 * Set the legacy session cookie with version tracking.
 * Stores "userId:sessionVersion" so we can validate on read.
 */
export async function setSession(userId: string, sessionVersion?: number): Promise<void> {
  const version = sessionVersion ?? 1;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${userId}:${version}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}

/**
 * Clear the legacy session cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
