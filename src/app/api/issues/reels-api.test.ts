import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock YouTube oEmbed to avoid network calls in tests
vi.mock('@/lib/youtube', async () => {
  const actual = await vi.importActual<typeof import('@/lib/youtube')>('@/lib/youtube');
  return {
    ...actual,
    getVideoMetadata: vi.fn().mockResolvedValue({
      title: 'Test Video Title',
      thumbnail_url: 'https://img.youtube.com/vi/test123/hqdefault.jpg',
      author_name: 'Test Channel',
    }),
  };
});

import { cookies } from 'next/headers';
import { GET, POST } from './[id]/reels/route';
import { POST as votePOST } from './[id]/reels/[reelId]/vote/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

function mockLoggedIn(userId: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === 'qr_user_id' ? { name: 'qr_user_id', value: String(userId) } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function mockLoggedOut() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

describe('GET /api/issues/[id]/reels', () => {
  it('returns approved reels for an issue', async () => {
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels');
    const response = await GET(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.length).toBe(2); // reel-001 + reel-002 (not reel-004 pending)
  });

  it('returns empty array for issue with no reels', async () => {
    const request = new Request('http://localhost:3000/api/issues/issue-flights/reels');
    const response = await GET(request, { params: Promise.resolve({ id: 'issue-flights' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(0);
  });
});

describe('POST /api/issues/[id]/reels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a reel when logged in with valid YouTube URL', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        youtube_url: 'https://www.youtube.com/watch?v=test1234567',
        caption: 'This is hilarious',
      }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('pending');
    expect(data.source).toBe('community');
    expect(data.youtube_video_id).toBe('test1234567');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ youtube_url: 'https://www.youtube.com/watch?v=test1234567' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid YouTube URL', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ youtube_url: 'https://example.com/not-youtube' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error).toBe('Invalid YouTube URL');
  });
});

describe('POST /api/issues/[id]/reels/[reelId]/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a vote when logged in', async () => {
    mockLoggedIn('user-marcio');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels/reel-001/vote', {
      method: 'POST',
    });
    const response = await votePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', reelId: 'reel-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.voted).toBe(true);
  });

  it('returns already:true for duplicate vote', async () => {
    mockLoggedIn('user-sarah'); // already voted on reel-001 in seed data
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels/reel-001/vote', {
      method: 'POST',
    });
    const response = await votePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', reelId: 'reel-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.already).toBe(true);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/issue-rail/reels/reel-001/vote', {
      method: 'POST',
    });
    const response = await votePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', reelId: 'reel-001' }),
    });
    expect(response.status).toBe(401);
  });
});
