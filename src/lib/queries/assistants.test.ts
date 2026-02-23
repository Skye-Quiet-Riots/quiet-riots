import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getAllAssistants,
  getAssistantByCategory,
  getAssistantDetail,
  getAssistantActivity,
  createAssistantClaim,
  getUserMetAssistants,
  recordAssistantIntroduction,
  createSuggestion,
} from './assistants';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getAllAssistants', () => {
  it('returns all assistant pairs', async () => {
    const assistants = await getAllAssistants();
    expect(assistants).toHaveLength(2);
  });

  it('has riot_count, rioter_count, action_count populated', async () => {
    const assistants = await getAllAssistants();
    for (const a of assistants) {
      expect(a).toHaveProperty('riot_count');
      expect(a).toHaveProperty('rioter_count');
      expect(a).toHaveProperty('action_count');
    }
  });

  it('is ordered by rioter_count DESC (transport first)', async () => {
    const assistants = await getAllAssistants();
    // Transport has higher aggregate rioter_count than telecoms
    // Note: the LEFT JOIN to actions inflates SUM(rioter_count) by row count per action
    // issue-rail (2847 * 5 actions) + issue-flights (12340 * 1 LEFT JOIN row) = 26575
    // issue-broadband (4112 * 1 action) = 4112
    expect(assistants[0].category).toBe('transport');
    expect(assistants[0].rioter_count).toBeGreaterThan(assistants[1].rioter_count);
    expect(assistants[1].category).toBe('telecoms');
  });

  it('has correct riot_count per category', async () => {
    const assistants = await getAllAssistants();
    const transport = assistants.find((a) => a.category === 'transport')!;
    const telecoms = assistants.find((a) => a.category === 'telecoms')!;
    expect(transport.riot_count).toBe(2); // issue-rail, issue-flights
    expect(telecoms.riot_count).toBe(1); // issue-broadband
  });

  it('has correct action_count per category', async () => {
    const assistants = await getAllAssistants();
    const transport = assistants.find((a) => a.category === 'transport')!;
    const telecoms = assistants.find((a) => a.category === 'telecoms')!;
    // issue-rail has 5 actions (action-001..004, action-006), issue-flights has 0
    expect(transport.action_count).toBe(5);
    // issue-broadband has 1 action (action-005)
    expect(telecoms.action_count).toBe(1);
  });
});

describe('getAssistantByCategory', () => {
  it('returns the transport assistant pair', async () => {
    const assistant = await getAssistantByCategory('transport');
    expect(assistant).not.toBeNull();
    expect(assistant!.category).toBe('transport');
    expect(assistant!.agent_name).toBe('Jett');
    expect(assistant!.human_name).toBe('Bex');
  });

  it('returns the telecoms assistant pair', async () => {
    const assistant = await getAssistantByCategory('telecoms');
    expect(assistant).not.toBeNull();
    expect(assistant!.category).toBe('telecoms');
    expect(assistant!.agent_name).toBe('Pulse');
    expect(assistant!.human_name).toBe('Jin');
  });

  it('returns null for nonexistent category', async () => {
    const assistant = await getAssistantByCategory('banking');
    expect(assistant).toBeNull();
  });
});

describe('getAssistantDetail', () => {
  it('returns transport pair with full detail', async () => {
    const detail = await getAssistantDetail('transport');
    expect(detail).not.toBeNull();
    expect(detail!.category).toBe('transport');
    expect(detail!.agent_name).toBe('Jett');
    expect(detail!.human_name).toBe('Bex');
  });

  it('includes riots array with issue-rail and issue-flights', async () => {
    const detail = await getAssistantDetail('transport');
    expect(detail!.riots).toHaveLength(2);
    const riotNames = detail!.riots.map((r) => r.name);
    expect(riotNames).toContain('Rail Cancellations');
    expect(riotNames).toContain('Flight Delays');
  });

  it('riots are ordered by rioter_count DESC', async () => {
    const detail = await getAssistantDetail('transport');
    expect(detail!.riots[0].name).toBe('Flight Delays'); // 12340
    expect(detail!.riots[1].name).toBe('Rail Cancellations'); // 2847
  });

  it('riots include per-riot assistant copy fields', async () => {
    const detail = await getAssistantDetail('transport');
    const rail = detail!.riots.find((r) => r.name === 'Rail Cancellations')!;
    expect(rail.agent_helps).toBe('Tracks cancellation patterns by route and time');
    expect(rail.human_helps).toBe('Connects rioters on the same routes');
    expect(rail.agent_focus).toBe('Analysing Avanti West Coast cancellation data');
    expect(rail.human_focus).toBe('Linking up rioters on the Manchester–London corridor');
  });

  it('includes recent_activity with 2 transport entries', async () => {
    const detail = await getAssistantDetail('transport');
    expect(detail!.recent_activity).toHaveLength(2);
    const actIds = detail!.recent_activity.map((a) => a.id);
    expect(actIds).toContain('act-001');
    expect(actIds).toContain('act-002');
  });

  it('recent_activity is ordered by created_at DESC', async () => {
    const detail = await getAssistantDetail('transport');
    // act-001: 2026-02-22, act-002: 2026-02-21
    expect(detail!.recent_activity[0].id).toBe('act-001');
    expect(detail!.recent_activity[1].id).toBe('act-002');
  });

  it('has correct stats for transport', async () => {
    const detail = await getAssistantDetail('transport');
    expect(detail!.riot_count).toBe(2);
    // rioter_count is inflated by LEFT JOIN to actions (same query pattern as getAllAssistants)
    expect(detail!.rioter_count).toBeGreaterThan(0);
    expect(detail!.action_count).toBe(5);
  });

  it('returns null for nonexistent category', async () => {
    const detail = await getAssistantDetail('banking');
    expect(detail).toBeNull();
  });
});

describe('getAssistantActivity', () => {
  it('returns transport activity (2 entries)', async () => {
    const activity = await getAssistantActivity('transport');
    expect(activity).toHaveLength(2);
  });

  it('filters by type agent (1 entry)', async () => {
    const activity = await getAssistantActivity('transport', 20, 0, 'agent');
    expect(activity).toHaveLength(1);
    expect(activity[0].id).toBe('act-001');
    expect(activity[0].assistant_type).toBe('agent');
  });

  it('filters by type human (1 entry)', async () => {
    const activity = await getAssistantActivity('transport', 20, 0, 'human');
    expect(activity).toHaveLength(1);
    expect(activity[0].id).toBe('act-002');
    expect(activity[0].assistant_type).toBe('human');
  });

  it('respects limit', async () => {
    const activity = await getAssistantActivity('transport', 1);
    expect(activity).toHaveLength(1);
    // Most recent first
    expect(activity[0].id).toBe('act-001');
  });

  it('respects offset', async () => {
    const activity = await getAssistantActivity('transport', 20, 1);
    expect(activity).toHaveLength(1);
    expect(activity[0].id).toBe('act-002');
  });

  it('returns telecoms activity (1 entry)', async () => {
    const activity = await getAssistantActivity('telecoms');
    expect(activity).toHaveLength(1);
    expect(activity[0].id).toBe('act-003');
    expect(activity[0].category).toBe('telecoms');
  });

  it('returns empty array for category with no activity', async () => {
    const activity = await getAssistantActivity('banking');
    expect(activity).toHaveLength(0);
  });
});

describe('createAssistantClaim', () => {
  it('creates a claim successfully', async () => {
    const claim = await createAssistantClaim('transport', 'user-sarah', 'I commute daily');
    expect(claim).toBeDefined();
    expect(claim.category).toBe('transport');
    expect(claim.user_id).toBe('user-sarah');
    expect(claim.message).toBe('I commute daily');
    expect(typeof claim.id).toBe('string');
    expect(claim.id.length).toBeGreaterThan(0);
  });

  it('creates a claim without message', async () => {
    const claim = await createAssistantClaim('telecoms', 'user-marcio');
    expect(claim.category).toBe('telecoms');
    expect(claim.user_id).toBe('user-marcio');
    expect(claim.message).toBeNull();
  });

  it('has created_at timestamp', async () => {
    const claim = await createAssistantClaim('transport', 'user-marcio', 'Another claim');
    expect(claim.created_at).toBeDefined();
  });
});

describe('getUserMetAssistants', () => {
  it('returns empty array for user with no introductions', async () => {
    const met = await getUserMetAssistants('user-sarah');
    expect(met).toEqual([]);
  });

  it('returns empty array for nonexistent user', async () => {
    const met = await getUserMetAssistants('nonexistent');
    expect(met).toEqual([]);
  });
});

describe('recordAssistantIntroduction', () => {
  it('records an introduction', async () => {
    const intro = await recordAssistantIntroduction('user-sarah', 'transport');
    expect(intro).toBeDefined();
    expect(intro.user_id).toBe('user-sarah');
    expect(intro.category).toBe('transport');
    expect(intro.introduced_at).toBeDefined();
  });

  it('calling again does not create a duplicate (INSERT OR IGNORE)', async () => {
    // Record same introduction again
    const intro = await recordAssistantIntroduction('user-sarah', 'transport');
    expect(intro.user_id).toBe('user-sarah');
    expect(intro.category).toBe('transport');

    // getUserMetAssistants should return only one entry for transport
    const met = await getUserMetAssistants('user-sarah');
    const transportCount = met.filter((c) => c === 'transport').length;
    expect(transportCount).toBe(1);
  });

  it('getUserMetAssistants returns the category after introduction', async () => {
    const met = await getUserMetAssistants('user-sarah');
    expect(met).toContain('transport');
  });

  it('records multiple categories for same user', async () => {
    await recordAssistantIntroduction('user-sarah', 'telecoms');
    const met = await getUserMetAssistants('user-sarah');
    expect(met).toContain('transport');
    expect(met).toContain('telecoms');
    expect(met).toHaveLength(2);
  });
});

describe('createSuggestion', () => {
  it('creates an action on the issue', async () => {
    const result = await createSuggestion(
      'user-sarah',
      'issue-rail',
      'Collect refund receipts as evidence',
    );
    expect(result.actionId).toBeDefined();
    expect(typeof result.actionId).toBe('string');
    expect(result.actionId.length).toBeGreaterThan(0);
  });

  it('returns assistant names for the category', async () => {
    const result = await createSuggestion(
      'user-sarah',
      'issue-rail',
      'Organise a commuter meetup',
    );
    expect(result.agentName).toBe('Jett');
    expect(result.humanName).toBe('Bex');
    expect(result.category).toBe('transport');
  });

  it('works for telecoms category issues', async () => {
    const result = await createSuggestion(
      'user-marcio',
      'issue-broadband',
      'Run community speed test day',
    );
    expect(result.agentName).toBe('Pulse');
    expect(result.humanName).toBe('Jin');
    expect(result.category).toBe('telecoms');
  });

  it('logs assistant activity', async () => {
    // Get telecoms activity count before
    const beforeActivity = await getAssistantActivity('telecoms');
    const beforeCount = beforeActivity.length;

    await createSuggestion('user-sarah', 'issue-broadband', 'Another suggestion');

    const afterActivity = await getAssistantActivity('telecoms');
    expect(afterActivity.length).toBe(beforeCount + 1);
    expect(afterActivity[0].activity_type).toBe('reviewed_actions');
    expect(afterActivity[0].assistant_type).toBe('agent');
  });

  it('throws "Issue not found" for bad issue ID', async () => {
    await expect(
      createSuggestion('user-sarah', 'nonexistent', 'Some suggestion'),
    ).rejects.toThrow('Issue not found');
  });
});
