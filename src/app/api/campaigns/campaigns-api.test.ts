import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { _resetRateLimitStore } from '@/lib/rate-limit';
import { GET as getCampaigns, POST as createCampaignPost } from './route';
import { GET as getCampaignById } from './[id]/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  _resetRateLimitStore();
});

afterAll(async () => {
  await teardownTestDb();
});

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

describe('GET /api/campaigns', () => {
  it('returns all campaigns', async () => {
    const request = createTestRequest('/api/campaigns');
    const response = await getCampaigns(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveLength(3);
  });

  it('has cache headers', async () => {
    const request = createTestRequest('/api/campaigns');
    const response = await getCampaigns(request);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
  });

  it('filters by status=active', async () => {
    const request = createTestRequest('/api/campaigns?status=active');
    const response = await getCampaigns(request);
    const { data } = await response.json();
    expect(data).toHaveLength(2);
    expect(data.every((c: { status: string }) => c.status === 'active')).toBe(true);
  });

  it('filters by status=funded', async () => {
    const request = createTestRequest('/api/campaigns?status=funded');
    const response = await getCampaigns(request);
    const { data } = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('camp-funded');
    expect(data[0].status).toBe('funded');
  });

  it('filters by issue_id', async () => {
    const request = createTestRequest('/api/campaigns?issue_id=issue-rail');
    const response = await getCampaigns(request);
    const { data } = await response.json();
    expect(data).toHaveLength(2);
    expect(data.every((c: { issue_id: string }) => c.issue_id === 'issue-rail')).toBe(true);
  });

  it('filters by issue_id and status together', async () => {
    const request = createTestRequest('/api/campaigns?issue_id=issue-rail&status=active');
    const response = await getCampaigns(request);
    const { data } = await response.json();
    expect(data).toHaveLength(2);
    expect(data.every((c: { issue_id: string }) => c.issue_id === 'issue-rail')).toBe(true);
    expect(data.every((c: { status: string }) => c.status === 'active')).toBe(true);
  });

  it('returns empty array for non-existent issue_id', async () => {
    const request = createTestRequest('/api/campaigns?issue_id=nonexistent');
    const response = await getCampaigns(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveLength(0);
  });
});

describe('GET /api/campaigns/[id]', () => {
  it('returns campaign by id', async () => {
    const response = await getCampaignById(
      new Request('http://localhost:3000/api/campaigns/camp-water-test'),
      { params: Promise.resolve({ id: 'camp-water-test' }) },
    );
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.id).toBe('camp-water-test');
    expect(data.title).toBe('Rail Legal Review');
    expect(data.target_pence).toBe(100000);
    expect(data.raised_pence).toBe(31000);
    expect(data.status).toBe('active');
  });

  it('has cache headers', async () => {
    const response = await getCampaignById(
      new Request('http://localhost:3000/api/campaigns/camp-water-test'),
      { params: Promise.resolve({ id: 'camp-water-test' }) },
    );
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
  });

  it('returns funded campaign', async () => {
    const response = await getCampaignById(
      new Request('http://localhost:3000/api/campaigns/camp-funded'),
      { params: Promise.resolve({ id: 'camp-funded' }) },
    );
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe('camp-funded');
    expect(data.status).toBe('funded');
    expect(data.raised_pence).toBe(data.target_pence);
  });

  it('returns 404 for non-existent campaign', async () => {
    const response = await getCampaignById(
      new Request('http://localhost:3000/api/campaigns/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('not found');
    expect(body.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/campaigns', () => {
  it('returns 401 without auth header', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        title: 'New Campaign',
        target_pence: 5000,
      },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with wrong token', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        title: 'New Campaign',
        target_pence: 5000,
      },
      headers: { authorization: 'Bearer wrong-key' },
    });
    const response = await createCampaignPost(request);
    expect(response.status).toBe(401);
  });

  it('returns validation error for missing title', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        target_pence: 5000,
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing issue_id', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        title: 'New Campaign',
        target_pence: 5000,
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for target below minimum', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        title: 'Tiny Campaign',
        target_pence: 50,
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('creates campaign with valid data', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        title: 'New Legal Fund',
        description: 'Fund for legal action',
        target_pence: 50000,
        recipient: 'Rail Action Group',
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe('New Legal Fund');
    expect(body.data.description).toBe('Fund for legal action');
    expect(body.data.target_pence).toBe(50000);
    expect(body.data.raised_pence).toBe(0);
    expect(body.data.status).toBe('active');
    expect(body.data.recipient).toBe('Rail Action Group');
    expect(body.data.id).toBeDefined();
  });

  it('creates campaign with minimal fields', async () => {
    const request = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-broadband',
        title: 'Broadband Campaign',
        target_pence: 100,
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const response = await createCampaignPost(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe('Broadband Campaign');
    expect(body.data.issue_id).toBe('issue-broadband');
  });

  it('newly created campaign appears in list', async () => {
    // Create a campaign
    const createRequest = createTestRequest('/api/campaigns', {
      method: 'POST',
      body: {
        issue_id: 'issue-flights',
        title: 'Flight Delay Compensation Fund',
        target_pence: 25000,
      },
      headers: { authorization: `Bearer ${BOT_API_KEY}` },
    });
    const createResponse = await createCampaignPost(createRequest);
    const { data: created } = await createResponse.json();
    expect(createResponse.status).toBe(201);

    // Verify it appears in the list
    const listRequest = createTestRequest('/api/campaigns?issue_id=issue-flights');
    const listResponse = await getCampaigns(listRequest);
    const { data: campaigns } = await listResponse.json();
    expect(campaigns.some((c: { id: string }) => c.id === created.id)).toBe(true);
  });
});
