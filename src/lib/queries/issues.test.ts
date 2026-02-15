import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getAllIssues,
  getIssueById,
  getIssuesByCategory,
  getTrendingIssues,
  getIssueCountsByCategory,
} from './issues';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getAllIssues', () => {
  it('returns all issues ordered by rioter_count DESC', async () => {
    const issues = await getAllIssues();
    expect(issues).toHaveLength(3);
    expect(issues[0].name).toBe('Flight Delays'); // 12340
    expect(issues[1].name).toBe('Broadband Speed'); // 4112
    expect(issues[2].name).toBe('Rail Cancellations'); // 2847
  });

  it('filters by category', async () => {
    const issues = await getAllIssues('Transport');
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.category === 'Transport')).toBe(true);
  });

  it('filters by name search', async () => {
    const issues = await getAllIssues(undefined, 'Rail');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('finds issues via synonym search', async () => {
    const issues = await getAllIssues(undefined, 'train cancellations');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('combines category and search filters', async () => {
    const issues = await getAllIssues('Transport', 'Rail');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('returns empty array when no matches', async () => {
    const issues = await getAllIssues(undefined, 'nonexistent');
    expect(issues).toHaveLength(0);
  });
});

describe('getIssueById', () => {
  it('returns the issue when found', async () => {
    const issue = await getIssueById(1);
    expect(issue).not.toBeNull();
    expect(issue!.name).toBe('Rail Cancellations');
    expect(issue!.category).toBe('Transport');
    expect(issue!.rioter_count).toBe(2847);
  });

  it('returns null for missing issue', async () => {
    const issue = await getIssueById(999);
    expect(issue).toBeNull();
  });
});

describe('getIssuesByCategory', () => {
  it('returns issues for the given category', async () => {
    const issues = await getIssuesByCategory('Transport');
    expect(issues).toHaveLength(2);
    expect(issues[0].rioter_count).toBeGreaterThanOrEqual(issues[1].rioter_count);
  });

  it('returns empty array for category with no issues', async () => {
    const issues = await getIssuesByCategory('Banking');
    expect(issues).toHaveLength(0);
  });
});

describe('getTrendingIssues', () => {
  it('returns issues ordered by trending_delta DESC', async () => {
    const issues = await getTrendingIssues();
    expect(issues[0].name).toBe('Flight Delays'); // 890
    expect(issues[1].name).toBe('Broadband Speed'); // 520
    expect(issues[2].name).toBe('Rail Cancellations'); // 340
  });

  it('respects the limit parameter', async () => {
    const issues = await getTrendingIssues(2);
    expect(issues).toHaveLength(2);
  });
});

describe('getIssueCountsByCategory', () => {
  it('returns correct counts per category', async () => {
    const counts = await getIssueCountsByCategory();
    expect(counts['Transport']).toBe(2);
    expect(counts['Telecoms']).toBe(1);
    expect(counts['Banking']).toBeUndefined();
  });
});
