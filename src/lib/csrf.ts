/**
 * CSRF protection via Origin/Referer header validation.
 *
 * Applied to all mutation routes (POST/PUT/DELETE).
 * Bot API is exempt (uses Bearer token, not cookies).
 */

const ALLOWED_ORIGINS = new Set(['https://www.quietriots.com', 'https://quietriots.com']);

// In development/test, allow localhost origins
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.add('http://localhost:3000');
  ALLOWED_ORIGINS.add('http://127.0.0.1:3000');
}

/**
 * Validate that a mutation request comes from an allowed origin.
 * Returns true if the request is safe, false if it should be rejected.
 *
 * Checks Origin header first (most reliable), falls back to Referer.
 * If neither is present, rejects the request (conservative approach).
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    return ALLOWED_ORIGINS.has(origin);
  }

  // Fallback to Referer header
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.has(refererOrigin);
    } catch {
      return false;
    }
  }

  // No Origin or Referer — reject
  return false;
}
