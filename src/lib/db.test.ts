import { describe, it, expect, vi } from 'vitest';
import { withTimeout, DEFAULT_QUERY_TIMEOUT_MS } from './db';

describe('withTimeout', () => {
  it('resolves when query completes within timeout', async () => {
    const result = await withTimeout(() => Promise.resolve('done'), 1000);
    expect(result).toBe('done');
  });

  it('rejects when query exceeds timeout', async () => {
    vi.useFakeTimers();
    const slowQuery = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 10_000));
    const promise = withTimeout(() => slowQuery, 50);

    vi.advanceTimersByTime(51);
    await expect(promise).rejects.toThrow('Query timed out after 50ms');
    vi.useRealTimers();
  });

  it('propagates query errors', async () => {
    await expect(
      withTimeout(() => Promise.reject(new Error('DB connection failed')), 1000),
    ).rejects.toThrow('DB connection failed');
  });

  it('has a sensible default timeout', () => {
    expect(DEFAULT_QUERY_TIMEOUT_MS).toBe(5000);
  });
});
