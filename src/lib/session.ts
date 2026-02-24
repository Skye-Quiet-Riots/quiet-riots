import { cookies } from 'next/headers';

const SESSION_COOKIE = 'qr_user_id';

/**
 * Get the current user's ID from the session.
 *
 * Checks Auth.js JWT session first (new system).
 * Falls back to legacy qr_user_id cookie (bridge period).
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

  // Fall back to legacy cookie
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return value || null;
}

/**
 * Set the legacy session cookie.
 * Used during the bridge period for backward compatibility.
 * New signups go through Auth.js and don't need this.
 */
export async function setSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
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
