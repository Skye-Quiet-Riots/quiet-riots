import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET, POST } from './[id]/feed/route';
import { POST as likePOST } from './[id]/feed/[postId]/like/route';
import { GET as commentsGET, POST as commentsPOST } from './[id]/feed/[postId]/comments/route';
import { POST as sharePOST } from './[id]/feed/[postId]/share/route';

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

describe('GET /api/issues/[id]/feed', () => {
  it('returns feed posts without auth', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed');
    const response = await GET(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });
});

describe('POST /api/issues/[id]/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a post when logged in', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'New post from test' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('New post from test');
    expect(data.user_name).toBe('Sarah K.');
  });

  it('accepts photo_urls when creating a post', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Post with photos',
        photo_urls: ['https://abc.public.blob.vercel-storage.com/photo1.jpg'],
      }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('Post with photos');
  });

  it('rejects non-Vercel-Blob photo URLs', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Bad photo',
        photo_urls: ['https://evil.com/bad.jpg'],
      }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(400);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Should fail' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 with empty content', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/issues/[id]/feed/[postId]/like', () => {
  it('increments likes', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/like', {
      method: 'POST',
    });
    const response = await likePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.liked).toBe(true);
  });
});

describe('GET /api/issues/[id]/feed/[postId]/comments', () => {
  it('returns comments for a post', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/comments');
    const response = await commentsGET(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('has cache headers', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/comments');
    const response = await commentsGET(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    expect(response.headers.get('cache-control')).toContain('public');
  });
});

describe('POST /api/issues/[id]/feed/[postId]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Test comment' }),
    });
    const response = await commentsPOST(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    expect(response.status).toBe(401);
  });

  it('creates a comment when logged in', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Nice post!' }),
    });
    const response = await commentsPOST(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('Nice post!');
  });

  it('returns 400 with empty content', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });
    const response = await commentsPOST(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/issues/[id]/feed/[postId]/share', () => {
  it('increments shares', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/share', {
      method: 'POST',
    });
    const response = await sharePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', postId: 'feed-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.shared).toBe(true);
  });
});
