import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

const SESSION_COOKIE = 'qr_user_id';
const AUTH_COOKIE_SECURE = '__Secure-authjs.session-token';
const AUTH_COOKIE_DEV = 'authjs.session-token';
const AUTH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days — matches Auth.js config

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
 * Set both the legacy session cookie AND the Auth.js JWT session cookie.
 *
 * The legacy cookie (`qr_user_id`) is checked server-side by `getSession()`.
 * The Auth.js JWT cookie is checked client-side by `useSession()` from next-auth/react.
 *
 * Without the Auth.js cookie, phone/password logins would appear unauthenticated
 * to client components (nav-bar, auth-gate, etc.) even though server-side auth works.
 */
export async function setSession(
  userId: string,
  sessionVersion?: number,
  userInfo?: { name?: string; email?: string; image?: string },
): Promise<void> {
  const version = sessionVersion ?? 1;
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();

  // 1. Legacy cookie (server-side getSession)
  cookieStore.set(SESSION_COOKIE, `${userId}:${version}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  // 2. Auth.js JWT cookie (client-side useSession)
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    try {
      const cookieName = isProduction ? AUTH_COOKIE_SECURE : AUTH_COOKIE_DEV;
      const token = await encode({
        token: {
          sub: userId,
          session_version: version,
          name: userInfo?.name,
          email: userInfo?.email,
          picture: userInfo?.image,
        },
        secret,
        salt: cookieName,
        maxAge: AUTH_MAX_AGE,
      });
      cookieStore.set(cookieName, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: AUTH_MAX_AGE,
        path: '/',
      });
    } catch {
      // Graceful degradation — legacy cookie still works for server-side auth
    }
  }
}

/**
 * Clear both the legacy session cookie and the Auth.js JWT session cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? AUTH_COOKIE_SECURE : AUTH_COOKIE_DEV;
  cookieStore.delete(cookieName);
}
