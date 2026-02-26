import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getActionInitiatives,
  getActionInitiativeById,
  createActionInitiative,
  getActionInitiativesForIssue,
  getActionInitiativesWithIssues,
} from './action-initiatives';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getActionInitiatives', () => {
  it('returns all action initiatives when no filters', async () => {
    const items = await getActionInitiatives();
    expect(items.length).toBe(3);
  });

  it('filters by issue_id', async () => {
    const items = await getActionInitiatives('issue-rail');
    expect(items.length).toBe(2);
    expect(items.every((c) => c.issue_id === 'issue-rail')).toBe(true);
  });

  it('filters by status', async () => {
    const active = await getActionInitiatives(undefined, 'active');
    expect(active.every((c) => c.status === 'active')).toBe(true);

    const goalReached = await getActionInitiatives(undefined, 'goal_reached');
    expect(goalReached.length).toBe(1);
    expect(goalReached[0].id).toBe('camp-funded');
  });

  it('filters by both issue_id and status', async () => {
    const items = await getActionInitiatives('issue-rail', 'active');
    expect(items.every((c) => c.issue_id === 'issue-rail' && c.status === 'active')).toBe(true);
  });
});

describe('getActionInitiativeById', () => {
  it('returns action initiative by id', async () => {
    const item = await getActionInitiativeById('camp-water-test');
    expect(item).not.toBeNull();
    expect(item!.title).toBe('Rail Legal Review');
    expect(item!.target_pence).toBe(100000);
  });

  it('returns null for non-existent id', async () => {
    const item = await getActionInitiativeById('nonexistent');
    expect(item).toBeNull();
  });
});

describe('createActionInitiative', () => {
  it('creates an action initiative with correct defaults', async () => {
    const item = await createActionInitiative({
      issueId: 'issue-broadband',
      title: 'Test Action Initiative',
      description: 'A test action initiative',
      targetPence: 50000,
      recipient: 'Test Org',
    });
    expect(item.title).toBe('Test Action Initiative');
    expect(item.target_pence).toBe(50000);
    expect(item.committed_pence).toBe(0);
    expect(item.supporter_count).toBe(0);
    expect(item.status).toBe('active');
    expect(item.service_fee_pct).toBe(15);
  });

  it('allows custom service fee', async () => {
    const item = await createActionInitiative({
      issueId: 'issue-rail',
      title: 'Low Fee Initiative',
      targetPence: 25000,
      serviceFeePct: 10,
    });
    expect(item.service_fee_pct).toBe(10);
  });
});

describe('getActionInitiativesWithIssues', () => {
  it('returns action initiatives joined with issue data', async () => {
    const items = await getActionInitiativesWithIssues();
    expect(items.length).toBeGreaterThan(0);
    // Every result should have issue_name and issue_category from the JOIN
    items.forEach((c) => {
      expect(c.issue_name).toBeDefined();
      expect(c.issue_category).toBeDefined();
      expect(typeof c.issue_name).toBe('string');
    });
  });

  it('filters by status', async () => {
    const goalReached = await getActionInitiativesWithIssues('goal_reached');
    expect(goalReached.length).toBeGreaterThanOrEqual(1);
    expect(goalReached.every((c) => c.status === 'goal_reached')).toBe(true);
    expect(goalReached[0].issue_name).toBeDefined();
  });

  it('returns empty for status with no matching action initiatives', async () => {
    const delivered = await getActionInitiativesWithIssues('delivered');
    expect(delivered).toHaveLength(0);
  });
});

describe('getActionInitiativesForIssue', () => {
  it('returns only active action initiatives for an issue', async () => {
    const items = await getActionInitiativesForIssue('issue-broadband');
    // camp-funded is goal_reached, not active; the new one we created above should appear
    expect(items.every((c) => c.status === 'active')).toBe(true);
  });

  it('returns empty for issue with no active action initiatives', async () => {
    const items = await getActionInitiativesForIssue('issue-flights');
    expect(items.length).toBe(0);
  });
});
