import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getCommunityHealth,
  getExpertProfiles,
  getFeedPosts,
  createFeedPost,
  likeFeedPost,
  getCountryBreakdown,
  getUserFeedPostCount,
  getUserTotalLikes,
} from './community';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getCommunityHealth', () => {
  it('returns health data for an issue', async () => {
    const health = await getCommunityHealth(1);
    expect(health).not.toBeNull();
    expect(health!.needs_met).toBe(82);
    expect(health!.membership).toBe(71);
    expect(health!.influence).toBe(68);
    expect(health!.connection).toBe(75);
  });

  it('returns null for issue with no health data', async () => {
    const health = await getCommunityHealth(999);
    expect(health).toBeNull();
  });
});

describe('getExpertProfiles', () => {
  it('returns experts for an issue', async () => {
    const experts = await getExpertProfiles(1);
    expect(experts).toHaveLength(2);
    const names = experts.map((e) => e.name);
    expect(names).toContain('Dr. Patel');
    expect(names).toContain('Yuki T.');
  });

  it('returns empty array for issue with no experts', async () => {
    const experts = await getExpertProfiles(999);
    expect(experts).toHaveLength(0);
  });
});

describe('getFeedPosts', () => {
  it('returns posts with user_name, ordered by created_at DESC', async () => {
    const posts = await getFeedPosts(1);
    expect(posts).toHaveLength(2);
    // Newest first
    expect(posts[0].content).toBe('Just got my refund!');
    expect(posts[0].user_name).toBe('Sarah K.');
    expect(posts[1].content).toBe('Same problem in Portugal');
    expect(posts[1].user_name).toBe('Marcio R.');
  });

  it('respects limit parameter', async () => {
    const posts = await getFeedPosts(1, 1);
    expect(posts).toHaveLength(1);
  });

  it('returns empty array for issue with no posts', async () => {
    const posts = await getFeedPosts(999);
    expect(posts).toHaveLength(0);
  });
});

describe('createFeedPost', () => {
  it('creates a post and returns it with user_name', async () => {
    const post = await createFeedPost(1, 1, 'This is a test post');
    expect(post.content).toBe('This is a test post');
    expect(post.user_name).toBe('Sarah K.');
    expect(post.issue_id).toBe(1);
    expect(post.user_id).toBe(1);
    expect(post.likes).toBe(0);
  });
});

describe('likeFeedPost', () => {
  it('increments the likes count', async () => {
    const before = await getFeedPosts(1);
    const post = before.find((p) => p.id === 1)!;
    const likesBefore = post.likes;

    await likeFeedPost(1);

    const after = await getFeedPosts(1);
    const postAfter = after.find((p) => p.id === 1)!;
    expect(postAfter.likes).toBe(likesBefore + 1);
  });
});

describe('getUserFeedPostCount', () => {
  it('returns the number of posts by a user', async () => {
    const count = await getUserFeedPostCount(1);
    // Sarah has 1 seeded post + 1 created in createFeedPost test
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 for user with no posts', async () => {
    const count = await getUserFeedPostCount(999);
    expect(count).toBe(0);
  });
});

describe('getUserTotalLikes', () => {
  it('returns total likes across all posts by a user', async () => {
    const total = await getUserTotalLikes(1);
    // Sarah's seeded post has 24 likes (+ any from likeFeedPost test)
    expect(total).toBeGreaterThanOrEqual(24);
  });

  it('returns 0 for user with no posts', async () => {
    const total = await getUserTotalLikes(999);
    expect(total).toBe(0);
  });
});

describe('getCountryBreakdown', () => {
  it('returns countries ordered by rioter_count DESC', async () => {
    const countries = await getCountryBreakdown(1);
    expect(countries).toHaveLength(2);
    expect(countries[0].country_name).toBe('United Kingdom');
    expect(countries[0].rioter_count).toBe(2134);
    expect(countries[1].country_name).toBe('France');
  });

  it('returns empty array for issue with no countries', async () => {
    const countries = await getCountryBreakdown(999);
    expect(countries).toHaveLength(0);
  });
});
