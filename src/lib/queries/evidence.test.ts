import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getEvidenceForIssue,
  getEvidenceForOrg,
  createEvidence,
  likeEvidence,
  shareEvidence,
  getEvidenceComments,
  addEvidenceComment,
  getEvidenceCountForIssue,
  getLiveEvidence,
} from './evidence';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getEvidenceForIssue', () => {
  it('returns evidence with user_name, live items first', async () => {
    const evidence = await getEvidenceForIssue('issue-rail');
    expect(evidence).toHaveLength(3);
    // Live item (ev-002) should come first
    expect(evidence[0].live).toBe(1);
    expect(evidence[0].user_name).toBe('Marcio R.');
    expect(evidence[0].org_name).toBe('Southern Rail');
    expect(evidence[0].issue_name).toBe('Rail Cancellations');
  });

  it('filters by org_id when provided', async () => {
    const evidence = await getEvidenceForIssue('issue-rail', 'org-southern');
    expect(evidence).toHaveLength(2);
    evidence.forEach((e) => expect(e.org_id).toBe('org-southern'));
  });

  it('returns empty array for issue with no evidence', async () => {
    const evidence = await getEvidenceForIssue('nonexistent');
    expect(evidence).toHaveLength(0);
  });

  it('respects limit parameter', async () => {
    const evidence = await getEvidenceForIssue('issue-rail', undefined, 1);
    expect(evidence).toHaveLength(1);
  });
});

describe('getEvidenceForOrg', () => {
  it('returns evidence for a specific org', async () => {
    const evidence = await getEvidenceForOrg('org-southern');
    expect(evidence).toHaveLength(2);
    evidence.forEach((e) => expect(e.org_name).toBe('Southern Rail'));
  });

  it('returns empty array for org with no evidence', async () => {
    const evidence = await getEvidenceForOrg('nonexistent');
    expect(evidence).toHaveLength(0);
  });
});

describe('createEvidence', () => {
  it('creates text evidence and returns it with user_name', async () => {
    const ev = await createEvidence({
      issueId: 'issue-rail',
      orgId: 'org-southern',
      userId: 'user-sarah',
      content: 'Test evidence post',
      mediaType: 'text',
    });
    expect(ev.content).toBe('Test evidence post');
    expect(ev.user_name).toBe('Sarah K.');
    expect(ev.org_name).toBe('Southern Rail');
    expect(ev.issue_name).toBe('Rail Cancellations');
    expect(ev.media_type).toBe('text');
    expect(ev.live).toBe(0);
    expect(ev.likes).toBe(0);
  });

  it('creates evidence without org', async () => {
    const ev = await createEvidence({
      issueId: 'issue-rail',
      orgId: null,
      userId: 'user-sarah',
      content: 'General evidence',
      mediaType: 'text',
    });
    expect(ev.org_id).toBeNull();
    expect(ev.org_name).toBeNull();
  });

  it('creates live evidence with live=1', async () => {
    const ev = await createEvidence({
      issueId: 'issue-rail',
      orgId: null,
      userId: 'user-marcio',
      content: 'Going live!',
      mediaType: 'live_stream',
      live: true,
    });
    expect(ev.live).toBe(1);
    expect(ev.media_type).toBe('live_stream');
  });

  it('stores photo_urls as JSON', async () => {
    const urls = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];
    const ev = await createEvidence({
      issueId: 'issue-rail',
      orgId: null,
      userId: 'user-sarah',
      content: 'Photo evidence',
      mediaType: 'photo',
      photoUrls: urls,
    });
    expect(JSON.parse(ev.photo_urls)).toEqual(urls);
  });
});

describe('likeEvidence', () => {
  it('increments likes count', async () => {
    const before = await getEvidenceForIssue('issue-rail');
    const ev = before.find((e) => e.id === 'ev-001')!;
    const likesBefore = ev.likes;

    await likeEvidence('ev-001');

    const after = await getEvidenceForIssue('issue-rail');
    const evAfter = after.find((e) => e.id === 'ev-001')!;
    expect(evAfter.likes).toBe(likesBefore + 1);
  });
});

describe('shareEvidence', () => {
  it('increments shares count', async () => {
    const before = await getEvidenceForIssue('issue-rail');
    const ev = before.find((e) => e.id === 'ev-001')!;
    const sharesBefore = ev.shares;

    await shareEvidence('ev-001');

    const after = await getEvidenceForIssue('issue-rail');
    const evAfter = after.find((e) => e.id === 'ev-001')!;
    expect(evAfter.shares).toBe(sharesBefore + 1);
  });
});

describe('getEvidenceComments', () => {
  it('returns comments with user_name ordered by created_at ASC', async () => {
    const comments = await getEvidenceComments('ev-001');
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe('Same problem here!');
    expect(comments[0].user_name).toBe('Marcio R.');
  });

  it('returns empty array for evidence with no comments', async () => {
    const comments = await getEvidenceComments('ev-002');
    expect(comments).toHaveLength(0);
  });
});

describe('addEvidenceComment', () => {
  it('creates comment and increments comments_count', async () => {
    const comment = await addEvidenceComment('ev-002', 'user-sarah', 'Hang in there!');
    expect(comment.content).toBe('Hang in there!');
    expect(comment.user_name).toBe('Sarah K.');

    // Verify comments_count incremented
    const evidence = await getEvidenceForIssue('issue-rail');
    const ev = evidence.find((e) => e.id === 'ev-002')!;
    expect(ev.comments_count).toBe(1);
  });
});

describe('getEvidenceCountForIssue', () => {
  it('returns count of evidence posts', async () => {
    const count = await getEvidenceCountForIssue('issue-rail');
    // 3 seeded + 4 created in tests above
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('returns 0 for issue with no evidence', async () => {
    const count = await getEvidenceCountForIssue('nonexistent');
    expect(count).toBe(0);
  });
});

describe('getLiveEvidence', () => {
  it('returns only live evidence', async () => {
    const live = await getLiveEvidence('issue-rail');
    expect(live.length).toBeGreaterThanOrEqual(1);
    live.forEach((e) => expect(e.live).toBe(1));
  });

  it('returns empty for issue with no live evidence', async () => {
    const live = await getLiveEvidence('issue-broadband');
    expect(live).toHaveLength(0);
  });
});
