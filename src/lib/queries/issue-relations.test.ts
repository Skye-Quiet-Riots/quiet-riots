import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getRelatedIssues, getIssueRelation } from './issue-relations';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getRelatedIssues', () => {
  it('returns related issues for an issue', async () => {
    const related = await getRelatedIssues('issue-rail');
    expect(related.length).toBeGreaterThanOrEqual(1);
    expect(related[0].issue_id).toBe('issue-broadband');
    expect(related[0].issue_name).toBe('Broadband Speed');
    expect(related[0].relation_type).toBe('related_to');
  });

  it('returns related issues from the other direction', async () => {
    const related = await getRelatedIssues('issue-broadband');
    expect(related.length).toBeGreaterThanOrEqual(1);
    expect(related[0].issue_id).toBe('issue-rail');
    expect(related[0].issue_name).toBe('Rail Cancellations');
  });

  it('returns empty for issue with no relations', async () => {
    const related = await getRelatedIssues('nonexistent');
    expect(related).toHaveLength(0);
  });
});

describe('getIssueRelation', () => {
  it('returns a specific relation', async () => {
    const relation = await getIssueRelation('issue-rail', 'issue-broadband');
    expect(relation).not.toBeNull();
    expect(relation!.child_id).toBe('issue-rail');
    expect(relation!.parent_id).toBe('issue-broadband');
    expect(relation!.relation_type).toBe('related_to');
  });

  it('returns null for non-existent relation', async () => {
    const relation = await getIssueRelation('issue-rail', 'nonexistent');
    expect(relation).toBeNull();
  });
});
