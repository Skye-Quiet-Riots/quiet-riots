import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET as getPricing } from './pricing/route';
import { POST as postDeploy } from './deploy/route';
import { GET as getDeployments } from './deployments/route';
import { GET as getDeployment } from './deployments/[id]/route';
import { POST as cancelDeployment } from './deployments/[id]/cancel/route';
import { POST as updateStatus } from './deployments/[id]/status/route';
import { GET as getFulfillers } from './fulfillers/route';

const BOT_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();

  // Seed chicken pricing + fulfiller for tests
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO chicken_pricing (id, country_code, currency, base_price_pence, distance_surcharge_pence, express_surcharge_pence, description)
          VALUES ('pricing-gb', 'GB', 'GBP', 5000, 1000, 2500, 'UK chicken deployment')`,
    args: [],
  });
  await db.execute({
    sql: `INSERT INTO chicken_fulfillers (id, name, city, country_code, radius_km)
          VALUES ('fulfiller-1', 'Clucky McChicken', 'London', 'GB', 30)`,
    args: [],
  });
  // Give sarah enough funds
  await db.execute({
    sql: "UPDATE wallets SET balance_pence = 50000 WHERE user_id = 'user-sarah'",
    args: [],
  });
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

function makeRequest(url: string, body?: object, headers?: Record<string, string>) {
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function makeNextRequest(url: string, headers?: Record<string, string>) {
  const { NextRequest } = require('next/server');
  return new NextRequest(new URL(url, 'http://localhost:3000'), { headers });
}

// --- Pricing ---

describe('GET /api/chicken/pricing', () => {
  it('returns all pricing', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/pricing');
    const response = await getPricing(req);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns pricing for specific country', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/pricing?country=GB');
    const response = await getPricing(req);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.country_code).toBe('GB');
    expect(body.data.base_price_pence).toBe(5000);
  });

  it('falls back to GB for unknown country', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/pricing?country=ZZ');
    const response = await getPricing(req);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.country_code).toBe('GB');
  });

  it('sets cache headers', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/pricing');
    const response = await getPricing(req);
    expect(response.headers.get('Cache-Control')).toContain('public');
  });
});

// --- Deploy ---

describe('POST /api/chicken/deploy', () => {
  it('creates a deployment', async () => {
    mockLoggedIn('user-sarah');
    const response = await postDeploy(
      makeRequest('http://localhost:3000/api/chicken/deploy', {
        target_name: 'Big CEO',
        target_address: '123 Corp St',
        target_city: 'London',
        target_country: 'GB',
        message_text: 'Fix the trains!',
        pricing_id: 'pricing-gb',
        amount_paid_pence: 5000,
        currency: 'GBP',
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.target_name).toBe('Big CEO');
    expect(body.data.status).toBe('paid');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await postDeploy(
      makeRequest('http://localhost:3000/api/chicken/deploy', {
        target_name: 'CEO',
        target_address: '123 St',
        target_city: 'London',
        target_country: 'GB',
        message_text: 'Test',
        pricing_id: 'pricing-gb',
        amount_paid_pence: 5000,
        currency: 'GBP',
      }),
    );
    expect(response.status).toBe(401);
  });

  it('validates required fields', async () => {
    mockLoggedIn('user-sarah');
    const response = await postDeploy(
      makeRequest('http://localhost:3000/api/chicken/deploy', {
        target_name: '',
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns error for insufficient funds', async () => {
    mockLoggedIn('user-sarah');
    const response = await postDeploy(
      makeRequest('http://localhost:3000/api/chicken/deploy', {
        target_name: 'CEO',
        target_address: '123 St',
        target_city: 'London',
        target_country: 'GB',
        message_text: 'Test',
        pricing_id: 'pricing-gb',
        amount_paid_pence: 9999999,
        currency: 'GBP',
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('Insufficient funds');
  });
});

// --- Deployments List ---

describe('GET /api/chicken/deployments', () => {
  it('returns user deployments', async () => {
    mockLoggedIn('user-sarah');
    const response = await getDeployments();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await getDeployments();
    expect(response.status).toBe(401);
  });

  it('returns empty for user with no deployments', async () => {
    mockLoggedIn('user-marcio');
    const response = await getDeployments();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.length).toBe(0);
  });
});

// --- Deployment Detail ---

describe('GET /api/chicken/deployments/[id]', () => {
  it('returns deployment detail for owner', async () => {
    // First get the list to find an ID
    mockLoggedIn('user-sarah');
    const listRes = await getDeployments();
    const listBody = await listRes.json();
    const deploymentId = listBody.data[0].id;

    const response = await getDeployment(
      makeRequest(`http://localhost:3000/api/chicken/deployments/${deploymentId}`),
      { params: Promise.resolve({ id: deploymentId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.id).toBe(deploymentId);
  });

  it('returns 403 for non-owner', async () => {
    mockLoggedIn('user-sarah');
    const listRes = await getDeployments();
    const listBody = await listRes.json();
    const deploymentId = listBody.data[0].id;

    mockLoggedIn('user-marcio');
    const response = await getDeployment(
      makeRequest(`http://localhost:3000/api/chicken/deployments/${deploymentId}`),
      { params: Promise.resolve({ id: deploymentId }) },
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 for non-existent deployment', async () => {
    mockLoggedIn('user-sarah');
    const response = await getDeployment(
      makeRequest('http://localhost:3000/api/chicken/deployments/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    );
    expect(response.status).toBe(404);
  });
});

// --- Cancel ---

describe('POST /api/chicken/deployments/[id]/cancel', () => {
  it('cancels a paid deployment', async () => {
    // Create a fresh deployment to cancel
    mockLoggedIn('user-sarah');
    const createRes = await postDeploy(
      makeRequest('http://localhost:3000/api/chicken/deploy', {
        target_name: 'Cancel Target',
        target_address: '789 Cancel St',
        target_city: 'London',
        target_country: 'GB',
        message_text: 'Will be cancelled',
        pricing_id: 'pricing-gb',
        amount_paid_pence: 1000,
        currency: 'GBP',
      }),
    );
    const createBody = await createRes.json();
    const deploymentId = createBody.data.id;

    const response = await cancelDeployment(
      makeRequest(`http://localhost:3000/api/chicken/deployments/${deploymentId}/cancel`, {}),
      { params: Promise.resolve({ id: deploymentId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.cancelled).toBe(true);
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await cancelDeployment(
      makeRequest('http://localhost:3000/api/chicken/deployments/some-id/cancel', {}),
      { params: Promise.resolve({ id: 'some-id' }) },
    );
    expect(response.status).toBe(401);
  });
});

// --- Status Update (Bot Auth) ---

describe('POST /api/chicken/deployments/[id]/status', () => {
  it('updates status with bot auth', async () => {
    // Get a deployment ID
    mockLoggedIn('user-sarah');
    const listRes = await getDeployments();
    const listBody = await listRes.json();
    const deploymentId = listBody.data[0].id;

    const req = makeNextRequest(
      `http://localhost:3000/api/chicken/deployments/${deploymentId}/status`,
      { authorization: `Bearer ${BOT_KEY}` },
    );
    // Override method to POST by creating a proper NextRequest
    const { NextRequest } = require('next/server');
    const postReq = new NextRequest(
      new URL(`http://localhost:3000/api/chicken/deployments/${deploymentId}/status`),
      {
        method: 'POST',
        headers: { authorization: `Bearer ${BOT_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'accepted', fulfiller_id: 'fulfiller-1' }),
      },
    );

    const response = await updateStatus(postReq, {
      params: Promise.resolve({ id: deploymentId }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.status).toBe('accepted');
  });

  it('rejects without bot auth', async () => {
    const { NextRequest } = require('next/server');
    const req = new NextRequest(
      new URL('http://localhost:3000/api/chicken/deployments/some-id/status'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      },
    );
    const response = await updateStatus(req, {
      params: Promise.resolve({ id: 'some-id' }),
    });
    expect(response.status).toBe(401);
  });
});

// --- Fulfillers (Bot Auth) ---

describe('GET /api/chicken/fulfillers', () => {
  it('returns fulfillers with bot auth', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/fulfillers', {
      authorization: `Bearer ${BOT_KEY}`,
    });
    const response = await getFulfillers(req);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('rejects without bot auth', async () => {
    const req = makeNextRequest('http://localhost:3000/api/chicken/fulfillers');
    const response = await getFulfillers(req);
    expect(response.status).toBe(401);
  });
});
