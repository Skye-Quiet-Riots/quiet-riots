import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST } from './[id]/recognition/route';

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

describe('POST /api/suggestions/[id]/recognition', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ public_recognition: false }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'suggestion-mobile' }) });
    expect(response.status).toBe(401);
  });

  it('returns 404 for nonexistent suggestion', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/nonexistent/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ public_recognition: false }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('returns 403 when non-owner tries to change preference', async () => {
    mockLoggedIn('user-sarah'); // not the suggestor
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ public_recognition: false }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'suggestion-mobile' }) });
    expect(response.status).toBe(403);
  });

  it('sets recognition to anonymous', async () => {
    mockLoggedIn('user-new'); // owner of suggestion-mobile
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ public_recognition: false }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'suggestion-mobile' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.suggestion.public_recognition).toBe(0);
  });

  it('sets recognition to public', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ public_recognition: true }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'suggestion-mobile' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.suggestion.public_recognition).toBe(1);
  });

  it('rejects invalid body', async () => {
    mockLoggedIn('user-new');
    const request = new NextRequest(
      'http://localhost:3000/api/suggestions/suggestion-mobile/recognition',
      {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      },
    );
    const response = await POST(request, { params: Promise.resolve({ id: 'suggestion-mobile' }) });
    expect(response.status).toBe(400);
  });
});
