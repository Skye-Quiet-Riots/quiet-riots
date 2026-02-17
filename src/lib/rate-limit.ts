/**
 * Simple in-memory sliding-window rate limiter.
 * Tracks request timestamps per key and rejects when the window limit is exceeded.
 */

const store = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // per window

export function rateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = store.get(key) ?? [];

  // Drop entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    store.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  store.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}

/** Clear all stored entries. Useful for testing. */
export function _resetRateLimitStore() {
  store.clear();
}
