import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';
import { getDb } from '@/lib/db';

// Mock next/headers for session cookie auth
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/users/me/accounts/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(async () => {
  _resetRateLimitStore();
  vi.clearAllMocks();

  // Clean up test accounts before each test
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM accounts', args: [] });
});

afterAll(async () => {
  await teardownTestDb();
});

function mockLoggedIn(userId: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === 'qr_user_id' ? { name: 'qr_user_id', value: userId } : undefined,
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

async function insertAccount(
  userId: string,
  provider: string,
  providerAccountId: string,
  type = 'oauth',
) {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO accounts (id, user_id, provider, provider_account_id, type)
          VALUES (?, ?, ?, ?, ?)`,
    args: [`acct-${provider}-${userId}`, userId, provider, providerAccountId, type],
  });
}

function createDeleteRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/users/me/accounts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/users/me/accounts', () => {
  it('returns connected accounts for logged-in user', async () => {
    mockLoggedIn('user-sarah');
    await insertAccount('user-sarah', 'google', 'google-12345');

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.accounts).toHaveLength(1);
    expect(body.data.accounts[0].provider).toBe('google');
  });

  it('returns empty array when no accounts connected', async () => {
    mockLoggedIn('user-sarah');

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.accounts).toHaveLength(0);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();

    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/users/me/accounts', () => {
  it('unlinks a connected account when user has multiple', async () => {
    mockLoggedIn('user-sarah');
    await insertAccount('user-sarah', 'google', 'google-12345');
    await insertAccount('user-sarah', 'facebook', 'fb-67890');

    const response = await DELETE(createDeleteRequest({ provider: 'google' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.provider).toBe('google');
    expect(body.data.unlinked).toBe(true);

    // Verify account was removed from DB
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE user_id = ?',
      args: ['user-sarah'],
    });
    expect(result.rows).toHaveLength(1);
    expect((result.rows[0] as unknown as { provider: string }).provider).toBe('facebook');
  });

  it('prevents unlinking the last connected account', async () => {
    mockLoggedIn('user-sarah');
    await insertAccount('user-sarah', 'google', 'google-12345');

    const response = await DELETE(createDeleteRequest({ provider: 'google' }));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toContain('Cannot unlink');
  });

  it('returns 404 when provider is not linked', async () => {
    mockLoggedIn('user-sarah');
    // Link google and email (resend) — but not facebook
    await insertAccount('user-sarah', 'google', 'google-12345');
    await insertAccount('user-sarah', 'resend', 'resend-sarah@test.com', 'email');

    // Try to unlink facebook which is not linked — count is 2 so passes safety check
    const response = await DELETE(createDeleteRequest({ provider: 'facebook' }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('facebook');
  });

  it('rejects unsupported providers', async () => {
    mockLoggedIn('user-sarah');
    await insertAccount('user-sarah', 'google', 'google-12345');
    await insertAccount('user-sarah', 'facebook', 'fb-67890');

    const response = await DELETE(createDeleteRequest({ provider: 'twitter' }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Unsupported provider');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();

    const response = await DELETE(createDeleteRequest({ provider: 'google' }));
    expect(response.status).toBe(401);
  });

  it('rejects invalid JSON body', async () => {
    mockLoggedIn('user-sarah');

    const request = new NextRequest('http://localhost:3000/api/users/me/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });

  it('rejects empty provider', async () => {
    mockLoggedIn('user-sarah');

    const response = await DELETE(createDeleteRequest({ provider: '' }));
    expect(response.status).toBe(400);
  });
});
