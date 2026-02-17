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

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

function mockLoggedIn(userId: number) {
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
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
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
    mockLoggedIn(1);
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'New post from test' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('New post from test');
    expect(data.user_name).toBe('Sarah K.');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Should fail' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 with empty content', async () => {
    mockLoggedIn(1);
    const request = new Request('http://localhost:3000/api/issues/1/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/issues/[id]/feed/[postId]/like', () => {
  it('increments likes', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/feed/1/like', {
      method: 'POST',
    });
    const response = await likePOST(request, {
      params: Promise.resolve({ id: '1', postId: '1' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.liked).toBe(true);
  });
});
