import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, getDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import {
  followIssue,
  unfollowIssue,
  hasFollowedIssue,
  getFollowedIssues,
  getFollowerCount,
  getFollowedIssueCount,
  joinIssue,
  leaveIssue,
} from './users';

beforeEach(async () => {
  const db = createClient({ url: ':memory:' });
  _setTestDb(db);
  await dropTables();
  await createTables();
  await seedTestData();
});

describe('followIssue', () => {
  it('follows an active issue', async () => {
    const result = await followIssue('user-sarah', 'issue-broadband');
    expect(result).toBe('followed');
    expect(await hasFollowedIssue('user-sarah', 'issue-broadband')).toBe(true);
  });

  it('returns already_following for duplicate follow', async () => {
    await followIssue('user-sarah', 'issue-broadband');
    const result = await followIssue('user-sarah', 'issue-broadband');
    expect(result).toBe('already_following');
  });

  it('returns not_found for non-existent issue', async () => {
    const result = await followIssue('user-sarah', 'issue-nonexistent');
    expect(result).toBe('not_found');
  });

  it('respects the 100 follow cap', async () => {
    // Insert 100 follows directly — use fake issue IDs without FK enforcement
    // We need to disable foreign keys temporarily for this test
    const db = getDb();
    await db.execute('PRAGMA foreign_keys = OFF');
    for (let i = 0; i < 100; i++) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO user_follows (id, user_id, issue_id, auto_followed) VALUES (?, ?, ?, 0)',
        args: [`follow-cap-${i}`, 'user-sarah', `fake-issue-${i}`],
      });
    }
    await db.execute('PRAGMA foreign_keys = ON');
    const result = await followIssue('user-sarah', 'issue-broadband');
    expect(result).toBe('max_reached');
  });
});

describe('unfollowIssue', () => {
  it('unfollows a followed issue', async () => {
    await followIssue('user-sarah', 'issue-broadband');
    const removed = await unfollowIssue('user-sarah', 'issue-broadband');
    expect(removed).toBe(true);
    expect(await hasFollowedIssue('user-sarah', 'issue-broadband')).toBe(false);
  });

  it('returns false when not following', async () => {
    const removed = await unfollowIssue('user-sarah', 'issue-broadband');
    expect(removed).toBe(false);
  });
});

describe('getFollowedIssues', () => {
  it('returns followed issues', async () => {
    await followIssue('user-sarah', 'issue-broadband');
    const issues = await getFollowedIssues('user-sarah');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.id === 'issue-broadband')).toBe(true);
  });

  it('returns empty array when no follows', async () => {
    const issues = await getFollowedIssues('user-marcio');
    expect(issues).toEqual([]);
  });
});

describe('getFollowerCount', () => {
  it('counts followers for an issue', async () => {
    await followIssue('user-sarah', 'issue-broadband');
    const count = await getFollowerCount('issue-broadband');
    expect(count).toBe(1);
  });

  it('returns 0 when no followers', async () => {
    const count = await getFollowerCount('issue-broadband');
    expect(count).toBe(0);
  });
});

describe('getFollowedIssueCount', () => {
  it('counts followed issues for a user', async () => {
    await followIssue('user-sarah', 'issue-broadband');
    await followIssue('user-sarah', 'issue-rail');
    const count = await getFollowedIssueCount('user-sarah');
    expect(count).toBe(2);
  });
});

describe('joinIssue auto-follow', () => {
  it('auto-follows when joining an issue', async () => {
    await joinIssue('user-marcio', 'issue-broadband');
    expect(await hasFollowedIssue('user-marcio', 'issue-broadband')).toBe(true);
  });

  it('preserves manual follow when joining', async () => {
    // Manual follow first
    await followIssue('user-marcio', 'issue-broadband');
    // Then join — should not overwrite the manual follow
    await joinIssue('user-marcio', 'issue-broadband');
    expect(await hasFollowedIssue('user-marcio', 'issue-broadband')).toBe(true);
  });
});

describe('leaveIssue auto-unfollow', () => {
  it('removes auto-follow when leaving', async () => {
    await joinIssue('user-marcio', 'issue-broadband');
    expect(await hasFollowedIssue('user-marcio', 'issue-broadband')).toBe(true);
    await leaveIssue('user-marcio', 'issue-broadband');
    expect(await hasFollowedIssue('user-marcio', 'issue-broadband')).toBe(false);
  });

  it('preserves manual follow when leaving', async () => {
    // Manual follow
    await followIssue('user-marcio', 'issue-broadband');
    // Then join (adds auto-follow via INSERT OR IGNORE — no-op since manual already exists)
    await joinIssue('user-marcio', 'issue-broadband');
    // Leave — should only remove auto_followed=1, but our manual is auto_followed=0
    await leaveIssue('user-marcio', 'issue-broadband');
    // Manual follow should survive
    expect(await hasFollowedIssue('user-marcio', 'issue-broadband')).toBe(true);
  });
});
