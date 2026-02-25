import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST, GET } from './me/onboarding/route';

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

describe('POST /api/users/me/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves interests and marks onboarding complete', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/users/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        interests: ['Transport', 'Health', 'Education'],
      }),
    });
    const response = await POST(request);
    const { data } = await response.json();
    expect(response.status).toBe(201);
    expect(data.interests).toHaveLength(3);
    expect(data.interests).toContain('Transport');
    expect(data.user.onboarding_completed).toBe(1);
  });

  it('saves language and country preferences', async () => {
    mockLoggedIn('user-marcio');
    const request = new Request('http://localhost:3000/api/users/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        interests: ['Banking'],
        language_code: 'pt-BR',
        country_code: 'BR',
      }),
    });
    const response = await POST(request);
    const { data } = await response.json();
    expect(response.status).toBe(201);
    expect(data.user.language_code).toBe('pt-BR');
    expect(data.user.country_code).toBe('BR');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/users/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ interests: ['Transport'] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 with no interests', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/users/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ interests: [] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 with invalid category', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/users/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ interests: ['InvalidCategory'] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/users/me/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns onboarding status when logged in', async () => {
    mockLoggedIn('user-sarah');
    const response = await GET();
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('onboarding_completed');
    expect(data).toHaveProperty('interests');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await GET();
    expect(response.status).toBe(401);
  });
});
