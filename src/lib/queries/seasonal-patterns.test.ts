import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getSeasonalPattern,
  getSeasonalPatternsByMonth,
  getAllSeasonalPatterns,
} from './seasonal-patterns';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getSeasonalPattern', () => {
  it('returns seasonal pattern for an issue that has one', async () => {
    const pattern = await getSeasonalPattern(1);
    expect(pattern).not.toBeNull();
    expect(pattern!.issue_id).toBe(1);
    expect(pattern!.peak_months).toBe('[11,12,1,2]');
    expect(pattern!.description).toContain('winter');
  });

  it('returns null for issue without seasonal pattern', async () => {
    const pattern = await getSeasonalPattern(2);
    expect(pattern).toBeNull();
  });
});

describe('getSeasonalPatternsByMonth', () => {
  it('returns patterns peaking in a given month', async () => {
    const patterns = await getSeasonalPatternsByMonth(7);
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns.some((p) => p.issue_id === 3)).toBe(true);
  });

  it('returns patterns peaking in winter', async () => {
    const patterns = await getSeasonalPatternsByMonth(12);
    expect(patterns.some((p) => p.issue_id === 1)).toBe(true);
  });

  it('returns empty for month with no patterns', async () => {
    const patterns = await getSeasonalPatternsByMonth(9);
    expect(patterns).toHaveLength(0);
  });
});

describe('getAllSeasonalPatterns', () => {
  it('returns all seasonal patterns', async () => {
    const patterns = await getAllSeasonalPatterns();
    expect(patterns).toHaveLength(2);
  });
});
