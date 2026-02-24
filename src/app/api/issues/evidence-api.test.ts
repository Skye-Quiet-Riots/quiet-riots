import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET, POST } from './[id]/evidence/route';
import { POST as likePOST } from './[id]/evidence/[evidenceId]/like/route';
import { POST as sharePOST } from './[id]/evidence/[evidenceId]/share/route';
import {
  GET as commentsGET,
  POST as commentPOST,
} from './[id]/evidence/[evidenceId]/comments/route';

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

describe('GET /api/issues/[id]/evidence', () => {
  it('returns evidence without auth', async () => {
    const request = new Request('http://localhost:3000/api/issues/issue-rail/evidence');
    const response = await GET(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(3);
  });

  it('filters by org_id query param', async () => {
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence?org_id=org-southern',
    );
    const response = await GET(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });
});

describe('POST /api/issues/[id]/evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates evidence when logged in', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/evidence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Test evidence from API', org_id: 'org-southern' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('Test evidence from API');
    expect(data.user_name).toBe('Sarah K.');
    expect(data.org_name).toBe('Southern Rail');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/issue-rail/evidence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Should fail' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 with empty content', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/evidence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(400);
  });

  it('creates live evidence', async () => {
    mockLoggedIn('user-marcio');
    const request = new Request('http://localhost:3000/api/issues/issue-rail/evidence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Going live from the station!',
        media_type: 'live_stream',
        live: true,
      }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.live).toBe(1);
    expect(data.media_type).toBe('live_stream');
  });
});

describe('POST /api/issues/[id]/evidence/[evidenceId]/like', () => {
  it('increments likes', async () => {
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence/ev-001/like',
      {
        method: 'POST',
      },
    );
    const response = await likePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', evidenceId: 'ev-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.liked).toBe(true);
  });
});

describe('POST /api/issues/[id]/evidence/[evidenceId]/share', () => {
  it('increments shares', async () => {
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence/ev-001/share',
      { method: 'POST' },
    );
    const response = await sharePOST(request, {
      params: Promise.resolve({ id: 'issue-rail', evidenceId: 'ev-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.shared).toBe(true);
  });
});

describe('GET /api/issues/[id]/evidence/[evidenceId]/comments', () => {
  it('returns comments', async () => {
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence/ev-001/comments',
    );
    const response = await commentsGET(request, {
      params: Promise.resolve({ id: 'issue-rail', evidenceId: 'ev-001' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].content).toBe('Same problem here!');
  });
});

describe('POST /api/issues/[id]/evidence/[evidenceId]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates comment when logged in', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence/ev-002/comments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Great evidence!' }),
      },
    );
    const response = await commentPOST(request, {
      params: Promise.resolve({ id: 'issue-rail', evidenceId: 'ev-002' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.content).toBe('Great evidence!');
    expect(data.user_name).toBe('Sarah K.');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request(
      'http://localhost:3000/api/issues/issue-rail/evidence/ev-001/comments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Should fail' }),
      },
    );
    const response = await commentPOST(request, {
      params: Promise.resolve({ id: 'issue-rail', evidenceId: 'ev-001' }),
    });
    expect(response.status).toBe(401);
  });
});
