import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getActionsForIssue,
  getActionsByType,
  getFilteredActions,
  getActionCountForIssue,
} from './actions';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getActionsForIssue', () => {
  it('returns all actions for an issue', async () => {
    const actions = await getActionsForIssue(1);
    expect(actions).toHaveLength(5); // 5 actions for issue 1
  });

  it('returns empty array for issue with no actions', async () => {
    const actions = await getActionsForIssue(999);
    expect(actions).toHaveLength(0);
  });
});

describe('getActionsByType', () => {
  it('filters by action type', async () => {
    const actions = await getActionsByType(1, 'action');
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.every((a) => a.type === 'action')).toBe(true);
  });

  it('filters by idea type', async () => {
    const actions = await getActionsByType(1, 'idea');
    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe('Brainstorm solutions');
  });

  it('filters by together type', async () => {
    const actions = await getActionsByType(1, 'together');
    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe('Welcome new members');
  });
});

describe('getFilteredActions', () => {
  it('filters by type', async () => {
    const actions = await getFilteredActions(1, { type: 'action' });
    expect(actions.every((a) => a.type === 'action')).toBe(true);
  });

  it('filters by time', async () => {
    const actions = await getFilteredActions(1, { time: '1min' });
    expect(actions.every((a) => a.time_required === '1min')).toBe(true);
  });

  it('filters by skills (includes empty skills_needed)', async () => {
    const actions = await getFilteredActions(1, { skills: 'writing' });
    // Should include actions with skills_needed containing 'writing' OR skills_needed = ''
    expect(actions.length).toBeGreaterThanOrEqual(1);
    const hasWriting = actions.some((a) => a.skills_needed.includes('writing'));
    expect(hasWriting).toBe(true);
  });

  it('handles multiple skills with OR logic', async () => {
    const actions = await getFilteredActions(1, { skills: 'writing,media' });
    // Should include: 'writing' actions, 'media' actions, and '' (empty skills) actions
    expect(actions.length).toBeGreaterThanOrEqual(2);
  });

  it('combines type and time filters', async () => {
    const actions = await getFilteredActions(1, { type: 'action', time: '10min' });
    expect(actions.every((a) => a.type === 'action' && a.time_required === '10min')).toBe(true);
  });

  it('returns all actions when no options given', async () => {
    const actions = await getFilteredActions(1);
    expect(actions).toHaveLength(5);
  });
});

describe('getActionCountForIssue', () => {
  it('returns correct count', async () => {
    const count = await getActionCountForIssue(1);
    expect(count).toBe(5);
  });

  it('returns 0 for issue with no actions', async () => {
    const count = await getActionCountForIssue(999);
    expect(count).toBe(0);
  });
});
