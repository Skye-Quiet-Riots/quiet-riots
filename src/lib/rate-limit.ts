/**
 * Simple in-memory sliding-window rate limiter.
 * Tracks request timestamps per key and rejects when the window limit is exceeded.
 */

const store = new Map<string, number[]>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30; // per window

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export function rateLimit(
  key: string,
  options?: RateLimitOptions,
): { allowed: boolean; retryAfterMs: number } {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  const now = Date.now();
  const timestamps = store.get(key) ?? [];

  // Drop entries outside the window
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterMs = windowMs - (now - oldest);
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
