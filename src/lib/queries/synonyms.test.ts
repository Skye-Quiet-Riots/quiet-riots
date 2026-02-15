import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getSynonymsForIssue, addSynonym } from './synonyms';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getSynonymsForIssue', () => {
  it('returns synonyms for an issue', async () => {
    const synonyms = await getSynonymsForIssue(1);
    expect(synonyms).toHaveLength(2);
    const terms = synonyms.map((s) => s.term);
    expect(terms).toContain('train cancellations');
    expect(terms).toContain('cancelled trains');
  });

  it('returns empty array for issue with no synonyms', async () => {
    const synonyms = await getSynonymsForIssue(999);
    expect(synonyms).toHaveLength(0);
  });
});

describe('addSynonym', () => {
  it('creates and returns a synonym', async () => {
    const synonym = await addSynonym(1, 'delayed trains');
    expect(synonym.issue_id).toBe(1);
    expect(synonym.term).toBe('delayed trains');
    expect(synonym.id).toBeDefined();

    // Verify it was persisted
    const all = await getSynonymsForIssue(1);
    expect(all.some((s) => s.term === 'delayed trains')).toBe(true);
  });
});
