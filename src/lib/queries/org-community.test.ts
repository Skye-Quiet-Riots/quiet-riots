import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getCommunityHealthForOrg,
  getFeedPostsForOrg,
  getExpertsForOrg,
  getCountryBreakdownForOrg,
} from './community';
import { getActionsForOrg } from './actions';
import { getReelsForOrg } from './reels';
import { getOrgCommunityData } from './organisations';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getCommunityHealthForOrg', () => {
  it('returns weighted health for org linked to issues with health data', async () => {
    // org-southern is linked to issue-rail (which has health data)
    const health = await getCommunityHealthForOrg('org-southern');
    expect(health).not.toBeNull();
    expect(health!.needs_met).toBeGreaterThanOrEqual(0);
    expect(health!.needs_met).toBeLessThanOrEqual(100);
    expect(health!.membership).toBeGreaterThanOrEqual(0);
    expect(health!.influence).toBeGreaterThanOrEqual(0);
    expect(health!.connection).toBeGreaterThanOrEqual(0);
  });

  it('returns null for org with no linked issues that have health data', async () => {
    const health = await getCommunityHealthForOrg('nonexistent');
    expect(health).toBeNull();
  });
});

describe('getFeedPostsForOrg', () => {
  it('returns feed posts from linked issues', async () => {
    // org-southern is linked to issue-rail, which has feed posts
    const posts = await getFeedPostsForOrg('org-southern');
    expect(posts.length).toBeGreaterThanOrEqual(2);
    // All posts should be from issue-rail (or issue-flights if they have posts)
    expect(posts[0].user_name).toBeDefined();
  });

  it('respects limit parameter', async () => {
    const posts = await getFeedPostsForOrg('org-southern', 1);
    expect(posts).toHaveLength(1);
  });

  it('returns empty array for org with no linked feed posts', async () => {
    const posts = await getFeedPostsForOrg('nonexistent');
    expect(posts).toHaveLength(0);
  });
});

describe('getExpertsForOrg', () => {
  it('returns experts from linked issues', async () => {
    // org-southern is linked to issue-rail, which has 2 experts
    const experts = await getExpertsForOrg('org-southern');
    expect(experts.length).toBeGreaterThanOrEqual(2);
    const names = experts.map((e) => e.name);
    expect(names).toContain('Dr. Patel');
    expect(names).toContain('Yuki T.');
  });

  it('returns empty array for org with no linked experts', async () => {
    const experts = await getExpertsForOrg('nonexistent');
    expect(experts).toHaveLength(0);
  });
});

describe('getCountryBreakdownForOrg', () => {
  it('returns aggregated countries across linked issues', async () => {
    // org-southern is linked to issue-rail, which has UK + France
    const countries = await getCountryBreakdownForOrg('org-southern');
    expect(countries.length).toBeGreaterThanOrEqual(1);
    // Should be ordered by rioter_count DESC
    if (countries.length > 1) {
      expect(countries[0].rioter_count).toBeGreaterThanOrEqual(countries[1].rioter_count);
    }
  });

  it('returns empty array for org with no linked country data', async () => {
    const countries = await getCountryBreakdownForOrg('nonexistent');
    expect(countries).toHaveLength(0);
  });
});

describe('getActionsForOrg', () => {
  it('returns actions from linked issues', async () => {
    // org-southern is linked to issue-rail, which has actions
    const actions = await getActionsForOrg('org-southern');
    expect(actions.length).toBeGreaterThanOrEqual(1);
  });

  it('respects limit parameter', async () => {
    const actions = await getActionsForOrg('org-southern', 1);
    expect(actions).toHaveLength(1);
  });

  it('returns empty array for org with no linked actions', async () => {
    const actions = await getActionsForOrg('nonexistent');
    expect(actions).toHaveLength(0);
  });
});

describe('getReelsForOrg', () => {
  it('returns approved/featured reels from linked issues', async () => {
    // org-southern is linked to issue-rail which has reels
    const reels = await getReelsForOrg('org-southern');
    // All returned reels should be approved or featured
    for (const reel of reels) {
      expect(['approved', 'featured']).toContain(reel.status);
    }
  });

  it('returns empty array for org with no linked reels', async () => {
    const reels = await getReelsForOrg('nonexistent');
    expect(reels).toHaveLength(0);
  });
});

describe('getOrgCommunityData', () => {
  it('returns all community data in one call', async () => {
    const data = await getOrgCommunityData('org-southern');
    // Should have all 6 fields
    expect(data).toHaveProperty('health');
    expect(data).toHaveProperty('feed');
    expect(data).toHaveProperty('experts');
    expect(data).toHaveProperty('countries');
    expect(data).toHaveProperty('actions');
    expect(data).toHaveProperty('reels');
    // Arrays should be non-empty for org-southern (linked to issue-rail with data)
    expect(data.feed.length).toBeGreaterThanOrEqual(1);
    expect(data.experts.length).toBeGreaterThanOrEqual(1);
    expect(data.actions.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty arrays for non-existent org', async () => {
    const data = await getOrgCommunityData('nonexistent');
    expect(data.health).toBeNull();
    expect(data.feed).toHaveLength(0);
    expect(data.experts).toHaveLength(0);
    expect(data.countries).toHaveLength(0);
    expect(data.actions).toHaveLength(0);
    expect(data.reels).toHaveLength(0);
  });
});
