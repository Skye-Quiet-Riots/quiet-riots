import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getReelsForIssue,
  getReelById,
  createReel,
  voteOnReel,
  hasVoted,
  getTrendingReels,
  getUnseenReelForUser,
  logReelShown,
  incrementReelViews,
} from './reels';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getReelsForIssue', () => {
  it('returns approved and featured reels sorted by upvotes', async () => {
    const reels = await getReelsForIssue('issue-rail');
    expect(reels.length).toBe(2); // reel-001 (approved) + reel-002 (approved), not reel-004 (pending)
    expect(reels[0].id).toBe('reel-001'); // 42 upvotes > 18
    expect(reels[1].id).toBe('reel-002');
  });

  it('excludes pending reels', async () => {
    const reels = await getReelsForIssue('issue-rail');
    const pending = reels.find((r) => r.id === 'reel-004');
    expect(pending).toBeUndefined();
  });

  it('returns featured reels', async () => {
    const reels = await getReelsForIssue('issue-broadband');
    expect(reels.length).toBe(1);
    expect(reels[0].status).toBe('featured');
  });

  it('returns empty array for issue with no reels', async () => {
    const reels = await getReelsForIssue('issue-flights');
    expect(reels).toEqual([]);
  });
});

describe('getReelById', () => {
  it('returns a reel by ID', async () => {
    const reel = await getReelById('reel-001');
    expect(reel).not.toBeNull();
    expect(reel!.title).toBe('British Rail — We Are Getting There (1987)');
    expect(reel!.source).toBe('curated');
  });

  it('returns null for non-existent ID', async () => {
    const reel = await getReelById('reel-nonexistent');
    expect(reel).toBeNull();
  });
});

describe('createReel', () => {
  it('creates a new reel with pending status by default', async () => {
    const reel = await createReel({
      issueId: 'issue-flights',
      youtubeUrl: 'https://www.youtube.com/watch?v=newvideo001',
      youtubeVideoId: 'newvideo001',
      title: 'Flight delay compilation',
      thumbnailUrl: 'https://img.youtube.com/vi/newvideo001/hqdefault.jpg',
      durationSeconds: 180,
      caption: 'Every airport ever',
      submittedBy: 'user-sarah',
      source: 'community',
    });
    expect(reel.id).toBeDefined();
    expect(reel.status).toBe('pending');
    expect(reel.source).toBe('community');
    expect(reel.upvotes).toBe(0);
  });

  it('creates a reel with explicit approved status', async () => {
    const reel = await createReel({
      issueId: 'issue-flights',
      youtubeUrl: 'https://www.youtube.com/watch?v=newvideo002',
      youtubeVideoId: 'newvideo002',
      title: 'Curated flight reel',
      thumbnailUrl: 'https://img.youtube.com/vi/newvideo002/hqdefault.jpg',
      durationSeconds: null,
      caption: 'A classic',
      submittedBy: null,
      source: 'curated',
      status: 'approved',
    });
    expect(reel.status).toBe('approved');
    expect(reel.submitted_by).toBeNull();
  });
});

describe('voteOnReel + hasVoted', () => {
  it('records a vote and increments upvotes', async () => {
    const before = await getReelById('reel-002');
    expect(before!.upvotes).toBe(18);

    await voteOnReel('reel-002', 'user-marcio');

    const after = await getReelById('reel-002');
    expect(after!.upvotes).toBe(19);
    expect(await hasVoted('reel-002', 'user-marcio')).toBe(true);
  });

  it('is idempotent — second vote does not increment', async () => {
    const before = await getReelById('reel-002');
    await voteOnReel('reel-002', 'user-marcio'); // already voted
    const after = await getReelById('reel-002');
    expect(after!.upvotes).toBe(before!.upvotes);
  });

  it('detects existing vote from seed data', async () => {
    expect(await hasVoted('reel-001', 'user-sarah')).toBe(true);
  });

  it('returns false for non-existent vote', async () => {
    expect(await hasVoted('reel-003', 'user-sarah')).toBe(false);
  });
});

describe('getTrendingReels', () => {
  it('returns reels with issue_name joined', async () => {
    const trending = await getTrendingReels(10);
    expect(trending.length).toBeGreaterThan(0);
    for (const reel of trending) {
      expect(reel.issue_name).toBeDefined();
      expect(['approved', 'featured']).toContain(reel.status);
    }
  });

  it('respects limit', async () => {
    const trending = await getTrendingReels(1);
    expect(trending.length).toBeLessThanOrEqual(1);
  });
});

describe('getUnseenReelForUser + logReelShown', () => {
  it('returns an unseen reel', async () => {
    const reel = await getUnseenReelForUser('issue-rail', 'user-marcio');
    expect(reel).not.toBeNull();
    expect(['approved', 'featured']).toContain(reel!.status);
  });

  it('excludes reels that have been shown', async () => {
    // Mark all rail reels as shown to user-sarah
    await logReelShown('user-sarah', 'reel-001', 'issue-rail');
    await logReelShown('user-sarah', 'reel-002', 'issue-rail');

    const reel = await getUnseenReelForUser('issue-rail', 'user-sarah');
    expect(reel).toBeNull(); // all shown
  });
});

describe('incrementReelViews', () => {
  it('increments view count', async () => {
    const before = await getReelById('reel-003');
    await incrementReelViews('reel-003');
    const after = await getReelById('reel-003');
    expect(after!.views).toBe(before!.views + 1);
  });
});
