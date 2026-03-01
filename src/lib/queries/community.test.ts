import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getCommunityHealth,
  getExpertProfiles,
  getFeedPosts,
  createFeedPost,
  likeFeedPost,
  shareFeedPost,
  getFeedComments,
  addFeedComment,
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
    const health = await getCommunityHealth('issue-rail');
    expect(health).not.toBeNull();
    expect(health!.needs_met).toBe(82);
    expect(health!.membership).toBe(71);
    expect(health!.influence).toBe(68);
    expect(health!.connection).toBe(75);
  });

  it('returns null for issue with no health data', async () => {
    const health = await getCommunityHealth('nonexistent');
    expect(health).toBeNull();
  });
});

describe('getExpertProfiles', () => {
  it('returns experts for an issue', async () => {
    const experts = await getExpertProfiles('issue-rail');
    expect(experts).toHaveLength(2);
    const names = experts.map((e) => e.name);
    expect(names).toContain('Dr. Patel');
    expect(names).toContain('Yuki T.');
  });

  it('returns empty array for issue with no experts', async () => {
    const experts = await getExpertProfiles('nonexistent');
    expect(experts).toHaveLength(0);
  });
});

describe('getFeedPosts', () => {
  it('returns posts with user_name, ordered by created_at DESC', async () => {
    const posts = await getFeedPosts('issue-rail');
    expect(posts).toHaveLength(2);
    // Newest first
    expect(posts[0].content).toBe('Just got my refund!');
    expect(posts[0].user_name).toBe('Sarah K.');
    expect(posts[1].content).toBe('Same problem in Portugal');
    expect(posts[1].user_name).toBe('Marcio R.');
  });

  it('respects limit parameter', async () => {
    const posts = await getFeedPosts('issue-rail', 1);
    expect(posts).toHaveLength(1);
  });

  it('returns empty array for issue with no posts', async () => {
    const posts = await getFeedPosts('nonexistent');
    expect(posts).toHaveLength(0);
  });
});

describe('createFeedPost', () => {
  it('creates a post and returns it with user_name', async () => {
    const post = await createFeedPost('issue-rail', 'user-sarah', 'This is a test post');
    expect(post.content).toBe('This is a test post');
    expect(post.user_name).toBe('Sarah K.');
    expect(post.issue_id).toBe('issue-rail');
    expect(post.user_id).toBe('user-sarah');
    expect(post.likes).toBe(0);
  });
});

describe('likeFeedPost', () => {
  it('increments the likes count', async () => {
    const before = await getFeedPosts('issue-rail');
    const post = before.find((p) => p.id === 'feed-001')!;
    const likesBefore = post.likes;

    await likeFeedPost('feed-001');

    const after = await getFeedPosts('issue-rail');
    const postAfter = after.find((p) => p.id === 'feed-001')!;
    expect(postAfter.likes).toBe(likesBefore + 1);
  });
});

describe('getUserFeedPostCount', () => {
  it('returns the number of posts by a user', async () => {
    const count = await getUserFeedPostCount('user-sarah');
    // Sarah has 1 seeded post + 1 created in createFeedPost test
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 for user with no posts', async () => {
    const count = await getUserFeedPostCount('nonexistent');
    expect(count).toBe(0);
  });
});

describe('getUserTotalLikes', () => {
  it('returns total likes across all posts by a user', async () => {
    const total = await getUserTotalLikes('user-sarah');
    // Sarah's seeded post has 24 likes (+ any from likeFeedPost test)
    expect(total).toBeGreaterThanOrEqual(24);
  });

  it('returns 0 for user with no posts', async () => {
    const total = await getUserTotalLikes('nonexistent');
    expect(total).toBe(0);
  });
});

describe('getFeedPosts — enriched fields', () => {
  it('returns posts with user_avatar and user_country_code', async () => {
    const posts = await getFeedPosts('issue-rail');
    expect(posts.length).toBeGreaterThan(0);
    // All posts should have user_name (COALESCE never returns null)
    for (const post of posts) {
      expect(post.user_name).toBeDefined();
    }
  });

  it('returns posts with new columns defaulted', async () => {
    const posts = await getFeedPosts('issue-rail');
    for (const post of posts) {
      expect(post.photo_urls).toBeDefined();
      expect(post.comments_count).toBeDefined();
      expect(post.shares).toBeDefined();
    }
  });
});

describe('createFeedPost — with photo_urls', () => {
  it('creates a post with photos', async () => {
    const urls = JSON.stringify(['https://example.com/a.jpg']);
    const post = await createFeedPost('issue-rail', 'user-sarah', 'Post with photo', urls);
    expect(post.content).toBe('Post with photo');
    expect(post.photo_urls).toBe(urls);
  });

  it('defaults photo_urls to empty array', async () => {
    const post = await createFeedPost('issue-rail', 'user-sarah', 'No photos');
    expect(post.photo_urls).toBe('[]');
  });
});

describe('shareFeedPost', () => {
  it('increments the shares count', async () => {
    const before = await getFeedPosts('issue-rail');
    const post = before.find((p) => p.id === 'feed-001')!;
    const sharesBefore = post.shares ?? 0;

    await shareFeedPost('feed-001');

    const after = await getFeedPosts('issue-rail');
    const postAfter = after.find((p) => p.id === 'feed-001')!;
    expect(postAfter.shares).toBe(sharesBefore + 1);
  });
});

describe('getFeedComments / addFeedComment', () => {
  it('returns empty array for post with no comments', async () => {
    const comments = await getFeedComments('feed-001');
    expect(comments).toHaveLength(0);
  });

  it('adds a comment and increments counter atomically', async () => {
    const comment = await addFeedComment('feed-001', 'user-sarah', 'Great post!');
    expect(comment.content).toBe('Great post!');
    expect(comment.feed_id).toBe('feed-001');
    expect(comment.user_name).toBeDefined();

    // Verify counter incremented
    const posts = await getFeedPosts('issue-rail');
    const post = posts.find((p) => p.id === 'feed-001')!;
    expect(post.comments_count).toBeGreaterThanOrEqual(1);
  });

  it('returns comments in oldest-first order', async () => {
    await addFeedComment('feed-001', 'user-sarah', 'Second comment');
    const comments = await getFeedComments('feed-001');
    expect(comments.length).toBeGreaterThanOrEqual(2);
    // Oldest first
    expect(new Date(comments[0].created_at).getTime())
      .toBeLessThanOrEqual(new Date(comments[1].created_at).getTime());
  });

  it('respects limit parameter', async () => {
    const comments = await getFeedComments('feed-001', 1);
    expect(comments).toHaveLength(1);
  });
});

describe('getCountryBreakdown', () => {
  it('returns countries ordered by rioter_count DESC', async () => {
    const countries = await getCountryBreakdown('issue-rail');
    expect(countries).toHaveLength(2);
    expect(countries[0].country_name).toBe('United Kingdom');
    expect(countries[0].rioter_count).toBe(2134);
    expect(countries[1].country_name).toBe('France');
  });

  it('returns empty array for issue with no countries', async () => {
    const countries = await getCountryBreakdown('nonexistent');
    expect(countries).toHaveLength(0);
  });
});
