import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST as createUserRoute } from './route';
import { GET as getMe } from './me/route';
import { GET as getUserDetail, PATCH as patchUser } from './[id]/route';

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
      name === 'qr_user_id' ? { name: 'qr_user_id', value: String(userId) } : undefined
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

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // setSession is called in the route, so we need cookies mock
    mockLoggedOut();
  });

  it('creates a new user', async () => {
    mockLoggedIn(0); // mock for setSession call
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New User', email: 'newuser@test.com' }),
    });
    const response = await createUserRoute(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.name).toBe('New User');
    expect(data.email).toBe('newuser@test.com');
  });

  it('returns existing user if email already exists', async () => {
    mockLoggedIn(0);
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sarah', email: 'sarah@example.com' }),
    });
    const response = await createUserRoute(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.name).toBe('Sarah K.'); // Original name, not 'Sarah'
  });

  it('returns 400 without name and email', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', email: '' }),
    });
    const response = await createUserRoute(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when logged in', async () => {
    mockLoggedIn(1);
    const response = await getMe();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.user.name).toBe('Sarah K.');
    expect(data.issues).toBeDefined();
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await getMe();
    expect(response.status).toBe(401);
  });
});

describe('GET /api/users/[id]', () => {
  it('returns user with issues', async () => {
    const request = new Request('http://localhost:3000/api/users/1');
    const response = await getUserDetail(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.user.name).toBe('Sarah K.');
    expect(data.issues).toBeDefined();
  });

  it('returns 404 for missing user', async () => {
    const request = new Request('http://localhost:3000/api/users/999');
    const response = await getUserDetail(request, { params: Promise.resolve({ id: '999' }) });
    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/users/[id]', () => {
  it('updates user fields', async () => {
    const request = new Request('http://localhost:3000/api/users/2', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ time_available: '1min' }),
    });
    const response = await patchUser(request, { params: Promise.resolve({ id: '2' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.time_available).toBe('1min');
  });

  it('returns 404 for missing user', async () => {
    const request = new Request('http://localhost:3000/api/users/999', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    });
    const response = await patchUser(request, { params: Promise.resolve({ id: '999' }) });
    expect(response.status).toBe(404);
  });
});
