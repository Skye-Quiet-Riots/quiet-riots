import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { trackBotEvent, getBotEventCounts, getRecentBotEvents, getBotDailyActiveUsers } from './bot-events';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('trackBotEvent', () => {
  it('records a basic event', async () => {
    await trackBotEvent({ action: 'identify' });

    const events = await getRecentBotEvents({ action: 'identify' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].action).toBe('identify');
    expect(events[0].status).toBe('ok');
  });

  it('records event with all fields', async () => {
    await trackBotEvent({
      action: 'join_issue',
      userId: 'user-sarah',
      issueId: 'issue-rail',
      durationMs: 42,
      status: 'ok',
      metadata: { orgId: null, assistantCategory: 'transport' },
    });

    const events = await getRecentBotEvents({ action: 'join_issue', userId: 'user-sarah' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const event = events[0];
    expect(event.user_id).toBe('user-sarah');
    expect(event.issue_id).toBe('issue-rail');
    expect(event.duration_ms).toBe(42);
    expect(event.status).toBe('ok');
    expect(event.metadata).toContain('transport');
  });

  it('records error events', async () => {
    await trackBotEvent({
      action: 'get_issue',
      status: 'error',
      errorMessage: 'Issue not found',
    });

    const events = await getRecentBotEvents({ action: 'get_issue' });
    const errorEvent = events.find((e) => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.error_message).toBe('Issue not found');
  });

  it('does not throw on failure', async () => {
    // Even if something goes wrong internally, trackBotEvent should not throw.
    // We test this by verifying the function completes without error.
    await expect(
      trackBotEvent({ action: 'a'.repeat(100) }), // exceeds CHECK constraint
    ).resolves.toBeUndefined();
  });
});

describe('getBotEventCounts', () => {
  it('returns counts grouped by action', async () => {
    const counts = await getBotEventCounts();
    expect(counts.length).toBeGreaterThan(0);
    expect(counts[0]).toHaveProperty('action');
    expect(counts[0]).toHaveProperty('count');
  });
});

describe('getRecentBotEvents', () => {
  it('returns events ordered by created_at desc', async () => {
    const events = await getRecentBotEvents();
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].created_at >= events[i].created_at).toBe(true);
    }
  });

  it('filters by action', async () => {
    const events = await getRecentBotEvents({ action: 'identify' });
    expect(events.every((e) => e.action === 'identify')).toBe(true);
  });

  it('filters by userId', async () => {
    const events = await getRecentBotEvents({ userId: 'user-sarah' });
    expect(events.every((e) => e.user_id === 'user-sarah')).toBe(true);
  });

  it('respects limit', async () => {
    const events = await getRecentBotEvents({ limit: 1 });
    expect(events.length).toBeLessThanOrEqual(1);
  });
});

describe('getBotDailyActiveUsers', () => {
  it('returns daily active user counts', async () => {
    const dau = await getBotDailyActiveUsers(7);
    expect(Array.isArray(dau)).toBe(true);
    if (dau.length > 0) {
      expect(dau[0]).toHaveProperty('date');
      expect(dau[0]).toHaveProperty('unique_users');
    }
  });
});
