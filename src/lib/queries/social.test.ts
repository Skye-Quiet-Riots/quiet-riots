import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { getDb } from '@/lib/db';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isBlocked,
  getBlockedUserIds,
  createReport,
  getReportsForEntity,
  getUserReports,
  getPendingReports,
  updateReportStatus,
} from './social';

beforeAll(async () => {
  await setupTestDb();
  const db = getDb();

  // Create test users
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-alice', 'Alice', 'alice@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-bob', 'Bob', 'bob@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-carol', 'Carol', 'carol@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-dave', 'Dave', 'dave@test.com'],
  });

  // Create a test issue and feed post (needed for report entity references)
  await db.execute({
    sql: "INSERT INTO issues (id, name, category, description) VALUES (?, ?, 'Transport', 'Test issue')",
    args: ['issue-social-test', 'Social Test Issue'],
  });
  await db.execute({
    sql: 'INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)',
    args: ['feed-social-1', 'issue-social-test', 'user-alice', 'A test post'],
  });
});

afterAll(async () => {
  await teardownTestDb();
});

// ========== BLOCKING ==========

// ---------- blockUser ----------

describe('blockUser', () => {
  it('creates a block record between two users', async () => {
    const block = await blockUser('user-alice', 'user-bob');
    expect(block.blocker_id).toBe('user-alice');
    expect(block.blocked_id).toBe('user-bob');
    expect(block.created_at).toBeDefined();
  });

  it('throws when attempting to self-block', async () => {
    await expect(blockUser('user-alice', 'user-alice')).rejects.toThrow();
  });

  it('is idempotent — blocking the same user twice does not throw', async () => {
    // user-alice already blocked user-bob in the first test
    const block = await blockUser('user-alice', 'user-bob');
    expect(block.blocker_id).toBe('user-alice');
    expect(block.blocked_id).toBe('user-bob');
  });

  it('allows mutual blocking (A blocks B, B blocks A)', async () => {
    const block = await blockUser('user-bob', 'user-alice');
    expect(block.blocker_id).toBe('user-bob');
    expect(block.blocked_id).toBe('user-alice');
  });

  it('allows blocking multiple different users', async () => {
    await blockUser('user-alice', 'user-carol');
    const blockedIds = await getBlockedUserIds('user-alice');
    expect(blockedIds).toContain('user-bob');
    expect(blockedIds).toContain('user-carol');
  });
});

// ---------- isBlocked ----------

describe('isBlocked', () => {
  it('returns true when user is blocked', async () => {
    const result = await isBlocked('user-alice', 'user-bob');
    expect(result).toBe(true);
  });

  it('returns false when user is not blocked', async () => {
    const result = await isBlocked('user-alice', 'user-dave');
    expect(result).toBe(false);
  });

  it('is directional — checks blocker→blocked only', async () => {
    // user-carol has not blocked user-alice (only the reverse)
    const result = await isBlocked('user-carol', 'user-alice');
    expect(result).toBe(false);
  });
});

// ---------- getBlockedUsers ----------

describe('getBlockedUsers', () => {
  it('returns list of blocked users with details', async () => {
    const blocked = await getBlockedUsers('user-alice');
    expect(blocked.length).toBe(2); // bob and carol
    const names = blocked.map((u) => u.blocked_id);
    expect(names).toContain('user-bob');
    expect(names).toContain('user-carol');
  });

  it('returns empty array for user who has not blocked anyone', async () => {
    const blocked = await getBlockedUsers('user-dave');
    expect(blocked).toEqual([]);
  });
});

// ---------- getBlockedUserIds ----------

describe('getBlockedUserIds', () => {
  it('returns string array of blocked user IDs', async () => {
    const ids = await getBlockedUserIds('user-alice');
    expect(ids).toContain('user-bob');
    expect(ids).toContain('user-carol');
    expect(ids.length).toBe(2);
  });

  it('returns empty array when no blocks exist', async () => {
    const ids = await getBlockedUserIds('user-dave');
    expect(ids).toEqual([]);
  });
});

// ---------- unblockUser ----------

describe('unblockUser', () => {
  it('removes an existing block', async () => {
    await unblockUser('user-alice', 'user-carol');
    const blocked = await isBlocked('user-alice', 'user-carol');
    expect(blocked).toBe(false);
  });

  it('does not throw when unblocking a user who is not blocked', async () => {
    // user-alice does not block user-dave
    await expect(unblockUser('user-alice', 'user-dave')).resolves.not.toThrow();
  });

  it('does not affect other blocks when removing one', async () => {
    // user-alice still blocks user-bob
    const blocked = await isBlocked('user-alice', 'user-bob');
    expect(blocked).toBe(true);
  });
});

// ========== REPORTING ==========

// ---------- createReport ----------

describe('createReport', () => {
  it('creates a report with all fields', async () => {
    const report = await createReport(
      'user-alice',
      'feed',
      'feed-social-1',
      'spam',
      'This post is spam content',
    );
    expect(report.id).toBeDefined();
    expect(report.reporter_id).toBe('user-alice');
    expect(report.entity_type).toBe('feed');
    expect(report.entity_id).toBe('feed-social-1');
    expect(report.reason).toBe('spam');
    expect(report.description).toBe('This post is spam content');
    expect(report.status).toBe('pending');
    expect(report.created_at).toBeDefined();
  });

  it('creates a report without optional description', async () => {
    const report = await createReport('user-bob', 'user', 'user-carol', 'harassment');
    expect(report.id).toBeDefined();
    expect(report.description).toBeNull();
    expect(report.reason).toBe('harassment');
  });

  it('allows multiple reports on the same entity from different users', async () => {
    await createReport('user-carol', 'feed', 'feed-social-1', 'misinformation');
    const reports = await getReportsForEntity('feed', 'feed-social-1');
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });

  it('supports all entity types', async () => {
    const feedReport = await createReport('user-dave', 'feed', 'feed-social-1', 'spam');
    expect(feedReport.entity_type).toBe('feed');

    const userReport = await createReport('user-dave', 'user', 'user-alice', 'inappropriate');
    expect(userReport.entity_type).toBe('user');

    const reelReport = await createReport('user-dave', 'reel', 'reel-fake-id', 'other', 'Details');
    expect(reelReport.entity_type).toBe('reel');

    const evidenceReport = await createReport(
      'user-dave',
      'evidence',
      'evidence-fake-id',
      'misinformation',
    );
    expect(evidenceReport.entity_type).toBe('evidence');
  });

  it('supports all reason types', async () => {
    const reasons = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'] as const;
    for (const reason of reasons) {
      const report = await createReport('user-alice', 'user', `user-reason-${reason}`, reason);
      expect(report.reason).toBe(reason);
    }
  });
});

// ---------- getReportsForEntity ----------

describe('getReportsForEntity', () => {
  it('returns all reports for a specific entity', async () => {
    const reports = await getReportsForEntity('feed', 'feed-social-1');
    expect(reports.length).toBeGreaterThanOrEqual(2);
    for (const report of reports) {
      expect(report.entity_type).toBe('feed');
      expect(report.entity_id).toBe('feed-social-1');
    }
  });

  it('returns empty array for entity with no reports', async () => {
    const reports = await getReportsForEntity('feed', 'nonexistent-feed');
    expect(reports).toEqual([]);
  });

  it('does not mix reports across entity types', async () => {
    const feedReports = await getReportsForEntity('feed', 'feed-social-1');
    const userReports = await getReportsForEntity('user', 'feed-social-1');
    // feed-social-1 has feed reports but not user reports
    expect(feedReports.length).toBeGreaterThan(0);
    expect(userReports).toEqual([]);
  });
});

// ---------- getUserReports ----------

describe('getUserReports', () => {
  it('returns all reports filed by a user', async () => {
    const reports = await getUserReports('user-dave');
    expect(reports.length).toBeGreaterThanOrEqual(4); // dave filed 4 reports above
    for (const report of reports) {
      expect(report.reporter_id).toBe('user-dave');
    }
  });

  it('respects the limit parameter', async () => {
    const reports = await getUserReports('user-dave', 2);
    expect(reports.length).toBe(2);
  });

  it('returns empty array for user with no reports', async () => {
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
      args: ['user-no-reports', 'No Reports', 'noreports@test.com'],
    });
    const reports = await getUserReports('user-no-reports');
    expect(reports).toEqual([]);
  });
});

// ---------- getPendingReports ----------

describe('getPendingReports', () => {
  it('returns only pending reports', async () => {
    const reports = await getPendingReports();
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(report.status).toBe('pending');
    }
  });

  it('respects the limit parameter', async () => {
    const reports = await getPendingReports(2);
    expect(reports.length).toBe(2);
  });
});

// ---------- updateReportStatus ----------

describe('updateReportStatus', () => {
  it('updates report status to reviewed', async () => {
    const reports = await getPendingReports(1);
    const reportId = reports[0].id as string;
    const updated = await updateReportStatus(reportId, 'reviewed');
    expect(updated.id).toBe(reportId);
    expect(updated.status).toBe('reviewed');
  });

  it('updates report status to actioned', async () => {
    const reports = await getPendingReports(1);
    const reportId = reports[0].id as string;
    const updated = await updateReportStatus(reportId, 'actioned');
    expect(updated.status).toBe('actioned');
  });

  it('updates report status to dismissed', async () => {
    const reports = await getPendingReports(1);
    const reportId = reports[0].id as string;
    const updated = await updateReportStatus(reportId, 'dismissed');
    expect(updated.status).toBe('dismissed');
  });

  it('throws for non-existent report', async () => {
    await expect(updateReportStatus('nonexistent-report', 'reviewed')).rejects.toThrow(
      'Report not found',
    );
  });

  it('updated reports no longer appear in pending list', async () => {
    const pendingBefore = await getPendingReports();
    const pendingCount = pendingBefore.length;

    if (pendingCount > 0) {
      const reportId = pendingBefore[0].id as string;
      await updateReportStatus(reportId, 'reviewed');
      const pendingAfter = await getPendingReports();
      expect(pendingAfter.length).toBe(pendingCount - 1);
    }
  });
});
