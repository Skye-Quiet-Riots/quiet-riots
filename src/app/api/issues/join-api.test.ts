import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST, DELETE } from './[id]/join/route';

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

describe('POST /api/issues/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joins an issue when logged in', async () => {
    mockLoggedIn(1);
    const request = new Request('http://localhost:3000/api/issues/2/join', { method: 'POST' });
    const response = await POST(request, { params: Promise.resolve({ id: '2' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.joined).toBe(true);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/2/join', { method: 'POST' });
    const response = await POST(request, { params: Promise.resolve({ id: '2' }) });
    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/issues/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leaves an issue when logged in', async () => {
    mockLoggedIn(1);
    const request = new Request('http://localhost:3000/api/issues/2/join', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: '2' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.left).toBe(true);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/issues/2/join', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: '2' }) });
    expect(response.status).toBe(401);
  });
});
