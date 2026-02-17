import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, _resetRateLimitStore } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it('allows requests under the limit', () => {
    const result = rateLimit('test-ip');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it('allows up to 30 requests per window', () => {
    for (let i = 0; i < 30; i++) {
      expect(rateLimit('test-ip').allowed).toBe(true);
    }
  });

  it('blocks the 31st request', () => {
    for (let i = 0; i < 30; i++) {
      rateLimit('test-ip');
    }
    const result = rateLimit('test-ip');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks separate keys independently', () => {
    for (let i = 0; i < 30; i++) {
      rateLimit('ip-a');
    }
    expect(rateLimit('ip-a').allowed).toBe(false);
    expect(rateLimit('ip-b').allowed).toBe(true);
  });

  it('resets correctly', () => {
    for (let i = 0; i < 30; i++) {
      rateLimit('test-ip');
    }
    _resetRateLimitStore();
    expect(rateLimit('test-ip').allowed).toBe(true);
  });
});
