import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET } from './route';
import { GET as getHistory } from './history/route';
import { POST as postContribute } from './contribute/route';
import { POST as postTopup } from './topup/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimitStore();
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

describe('GET /api/wallet', () => {
  it('returns wallet balance for authed user', async () => {
    mockLoggedIn('user-sarah');
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.wallet.balance_pence).toBe(500);
    expect(body.data.summary).toBeDefined();
  });

  it('creates wallet for user without one', async () => {
    mockLoggedIn('user-marcio');
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.wallet.balance_pence).toBe(0);
    expect(body.data.wallet.user_id).toBe('user-marcio');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe('GET /api/wallet — invalid session', () => {
  it('returns 401 when session cookie has non-existent user ID', async () => {
    mockLoggedIn('user-does-not-exist');
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toContain('User not found');
  });
});

describe('GET /api/wallet/history', () => {
  it('returns transaction history', async () => {
    mockLoggedIn('user-sarah');
    const response = await getHistory();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.transactions.length).toBeGreaterThan(0);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await getHistory();
    expect(response.status).toBe(401);
  });

  it('returns 401 for non-existent user', async () => {
    mockLoggedIn('user-does-not-exist');
    const response = await getHistory();
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toContain('User not found');
  });

  it('returns empty for user without wallet', async () => {
    // Create a user with no wallet
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)`,
      args: ['user-new-hist', 'New Hist', 'newhist@test.com'],
    });
    mockLoggedIn('user-new-hist');
    const response = await getHistory();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.transactions).toEqual([]);
  });
});

describe('POST /api/wallet/topup', () => {
  it('instantly credits wallet with simulated top-up', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/topup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount_pence: 500 }),
    });
    const response = await postTopup(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.transaction.amount_pence).toBe(500);
    expect(body.data.wallet).toBeDefined();
    expect(body.data.wallet.balance_pence).toBeGreaterThan(0);
  });

  it('returns 401 for non-existent user', async () => {
    mockLoggedIn('user-does-not-exist');
    const request = new Request('http://localhost:3000/api/wallet/topup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount_pence: 500 }),
    });
    const response = await postTopup(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toContain('User not found');
  });

  it('rejects topup below £1', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/topup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount_pence: 50 }),
    });
    const response = await postTopup(request);
    expect(response.status).toBe(400);
  });
});

describe('POST /api/wallet/contribute', () => {
  it('deducts from wallet and credits campaign', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-water-test', amount_pence: 50 }),
    });
    const response = await postContribute(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.transaction.type).toBe('contribute');
    expect(body.data.wallet_balance_pence).toBeDefined();
  });

  it('returns error for insufficient funds', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-water-test', amount_pence: 999999 }),
    });
    const response = await postContribute(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Insufficient funds');
  });

  it('returns 404 for non-existent campaign', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-nonexistent', amount_pence: 50 }),
    });
    const response = await postContribute(request);
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error).toContain('Campaign not found');
  });

  it('returns error for funded (inactive) campaign', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-funded', amount_pence: 50 }),
    });
    const response = await postContribute(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('not active');
  });

  it('returns 401 for non-existent user', async () => {
    mockLoggedIn('user-does-not-exist');
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-water-test', amount_pence: 50 }),
    });
    const response = await postContribute(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toContain('User not found');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/wallet/contribute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'camp-water-test', amount_pence: 50 }),
    });
    const response = await postContribute(request);
    expect(response.status).toBe(401);
  });
});
