import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { _resetRateLimitStore } from '@/lib/rate-limit';

// Mock next/headers for routes that use getSession()
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET as getAssistants } from './route';
import { GET as getAssistantDetail } from './[category]/route';
import { GET as getAssistantActivity } from './[category]/activity/route';
import { POST as postClaim } from './[category]/claim/route';
import {
  GET as getMetAssistants,
  POST as postMetAssistant,
} from '@/app/api/users/[id]/met-assistants/route';
import { POST as postSuggestion } from '@/app/api/suggestions/route';

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

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  _resetRateLimitStore();
  vi.clearAllMocks();
});

afterAll(async () => {
  await teardownTestDb();
});

// ---------------------------------------------------------------
// 1. GET /api/assistants
// ---------------------------------------------------------------
describe('GET /api/assistants', () => {
  it('returns all assistants with stats', async () => {
    const response = await getAssistants();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
    for (const a of body.data) {
      expect(a).toHaveProperty('riot_count');
      expect(a).toHaveProperty('rioter_count');
      expect(a).toHaveProperty('action_count');
      expect(a).toHaveProperty('agent_name');
      expect(a).toHaveProperty('human_name');
    }
  });

  it('returns JSON with ok: true', async () => {
    const response = await getAssistants();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------
// 2. GET /api/assistants/[category]
// ---------------------------------------------------------------
describe('GET /api/assistants/[category]', () => {
  it('returns transport detail', async () => {
    const request = new Request('http://localhost:3000/api/assistants/transport');
    const response = await getAssistantDetail(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.category).toBe('transport');
    expect(body.data.agent_name).toBe('Jett');
    expect(body.data.human_name).toBe('Bex');
    expect(body.data.riots).toBeDefined();
    expect(body.data.recent_activity).toBeDefined();
  });

  it('returns 400 for invalid category', async () => {
    const request = new Request('http://localhost:3000/api/assistants/!!invalid!!');
    const response = await getAssistantDetail(request, {
      params: Promise.resolve({ category: '!!invalid!!' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for valid but nonexistent category', async () => {
    // 'banking' is a valid AssistantCategory but has no seed data
    const request = new Request('http://localhost:3000/api/assistants/banking');
    const response = await getAssistantDetail(request, {
      params: Promise.resolve({ category: 'banking' }),
    });
    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------
// 3. GET /api/assistants/[category]/activity
// ---------------------------------------------------------------
describe('GET /api/assistants/[category]/activity', () => {
  it('returns activity for transport', async () => {
    const request = new NextRequest('http://localhost:3000/api/assistants/transport/activity');
    const response = await getAssistantActivity(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('supports limit query param', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/assistants/transport/activity?limit=1',
    );
    const response = await getAssistantActivity(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    const body = await response.json();
    expect(body.data).toHaveLength(1);
  });

  it('supports type=agent filter', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/assistants/transport/activity?type=agent',
    );
    const response = await getAssistantActivity(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].assistant_type).toBe('agent');
  });

  it('returns 400 for invalid category', async () => {
    const request = new NextRequest('http://localhost:3000/api/assistants/!!invalid!!/activity');
    const response = await getAssistantActivity(request, {
      params: Promise.resolve({ category: '!!invalid!!' }),
    });
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------
// 4. POST /api/assistants/[category]/claim
// ---------------------------------------------------------------
describe('POST /api/assistants/[category]/claim', () => {
  /** Helper to create a claim request with optional cookie auth */
  function claimRequest(category: string, userId?: string, body: unknown = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (userId) headers.cookie = `qr_user_id=${userId}`;
    return new NextRequest(`http://localhost:3000/api/assistants/${category}/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  it('returns 401 if no cookie auth', async () => {
    const request = claimRequest('transport', undefined, { message: 'I commute daily' });
    const response = await postClaim(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    expect(response.status).toBe(401);
  });

  it('creates claim with valid auth', async () => {
    const request = claimRequest('transport', 'user-sarah', {
      message: 'I commute daily on Avanti',
    });
    const response = await postClaim(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.category).toBe('transport');
    expect(body.data.user_id).toBe('user-sarah');
    expect(body.data.message).toBe('I commute daily on Avanti');
  });

  it('returns 400 for invalid category', async () => {
    const request = claimRequest('!!invalid!!', 'user-sarah');
    const response = await postClaim(request, {
      params: Promise.resolve({ category: '!!invalid!!' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 429 on rate limit', async () => {
    // Exhaust the rate limit (30 requests per window)
    for (let i = 0; i < 30; i++) {
      const req = claimRequest('transport', 'user-sarah');
      await postClaim(req, { params: Promise.resolve({ category: 'transport' }) });
    }

    const request = claimRequest('transport', 'user-sarah');
    const response = await postClaim(request, {
      params: Promise.resolve({ category: 'transport' }),
    });
    expect(response.status).toBe(429);
  });
});

// ---------------------------------------------------------------
// 5. GET/POST /api/users/[id]/met-assistants
// ---------------------------------------------------------------
describe('GET /api/users/[id]/met-assistants', () => {
  it('returns met list when session matches', async () => {
    mockLoggedIn('user-marcio');
    const request = new Request('http://localhost:3000/api/users/user-marcio/met-assistants');
    const response = await getMetAssistants(request, {
      params: Promise.resolve({ id: 'user-marcio' }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.met).toBeDefined();
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = new Request('http://localhost:3000/api/users/user-marcio/met-assistants');
    const response = await getMetAssistants(request, {
      params: Promise.resolve({ id: 'user-marcio' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when session does not match', async () => {
    mockLoggedIn('user-sarah');
    const request = new Request('http://localhost:3000/api/users/user-marcio/met-assistants');
    const response = await getMetAssistants(request, {
      params: Promise.resolve({ id: 'user-marcio' }),
    });
    expect(response.status).toBe(403);
  });
});

describe('POST /api/users/[id]/met-assistants', () => {
  it('records introduction when session matches', async () => {
    mockLoggedIn('user-marcio');
    const postReq = createTestRequest('/api/users/user-marcio/met-assistants', {
      method: 'POST',
      body: { category: 'transport' },
    });
    const postRes = await postMetAssistant(postReq, {
      params: Promise.resolve({ id: 'user-marcio' }),
    });
    const postBody = await postRes.json();
    expect(postRes.status).toBe(201);
    expect(postBody.ok).toBe(true);
    expect(postBody.data.category).toBe('transport');

    // Now GET should return the recorded category
    const getReq = new Request('http://localhost:3000/api/users/user-marcio/met-assistants');
    const getRes = await getMetAssistants(getReq, {
      params: Promise.resolve({ id: 'user-marcio' }),
    });
    const getBody = await getRes.json();
    expect(getBody.data.met).toContain('transport');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = createTestRequest('/api/users/user-sarah/met-assistants', {
      method: 'POST',
      body: { category: 'transport' },
    });
    const response = await postMetAssistant(request, {
      params: Promise.resolve({ id: 'user-sarah' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when session does not match', async () => {
    mockLoggedIn('user-marcio');
    const request = createTestRequest('/api/users/user-sarah/met-assistants', {
      method: 'POST',
      body: { category: 'transport' },
    });
    const response = await postMetAssistant(request, {
      params: Promise.resolve({ id: 'user-sarah' }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 404 for nonexistent user when session matches', async () => {
    mockLoggedIn('nonexistent');
    const request = createTestRequest('/api/users/nonexistent/met-assistants', {
      method: 'POST',
      body: { category: 'transport' },
    });
    const response = await postMetAssistant(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid category', async () => {
    mockLoggedIn('user-sarah');
    const request = createTestRequest('/api/users/user-sarah/met-assistants', {
      method: 'POST',
      body: { category: '!!invalid!!' },
    });
    const response = await postMetAssistant(request, {
      params: Promise.resolve({ id: 'user-sarah' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 429 on rate limit', async () => {
    mockLoggedIn('user-sarah');
    for (let i = 0; i < 30; i++) {
      const req = createTestRequest('/api/users/user-sarah/met-assistants', {
        method: 'POST',
        body: { category: 'telecoms' },
      });
      await postMetAssistant(req, { params: Promise.resolve({ id: 'user-sarah' }) });
    }

    const request = createTestRequest('/api/users/user-sarah/met-assistants', {
      method: 'POST',
      body: { category: 'telecoms' },
    });
    const response = await postMetAssistant(request, {
      params: Promise.resolve({ id: 'user-sarah' }),
    });
    expect(response.status).toBe(429);
  });
});

// ---------------------------------------------------------------
// 6. POST /api/suggestions
// ---------------------------------------------------------------
describe('POST /api/suggestions', () => {
  it('creates suggestion when logged in', async () => {
    mockLoggedIn('user-sarah');
    const request = createTestRequest('/api/suggestions', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        suggestion_text: 'Track platform overcrowding with photos',
      },
    });
    const response = await postSuggestion(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.actionId).toBeDefined();
    expect(body.data.agentName).toBe('Jett');
    expect(body.data.humanName).toBe('Bex');
    expect(body.data.category).toBe('transport');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const request = createTestRequest('/api/suggestions', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        suggestion_text: 'Some suggestion',
      },
    });
    const response = await postSuggestion(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    mockLoggedIn('user-sarah');
    const request = createTestRequest('/api/suggestions', {
      method: 'POST',
      body: {},
    });
    const response = await postSuggestion(request);
    expect(response.status).toBe(400);
  });

  it('returns 404 for nonexistent issue', async () => {
    mockLoggedIn('user-sarah');
    const request = createTestRequest('/api/suggestions', {
      method: 'POST',
      body: {
        issue_id: 'nonexistent-issue',
        suggestion_text: 'Some suggestion',
      },
    });
    const response = await postSuggestion(request);
    expect(response.status).toBe(404);
  });

  it('returns 429 on rate limit', async () => {
    mockLoggedIn('user-sarah');
    for (let i = 0; i < 30; i++) {
      const req = createTestRequest('/api/suggestions', {
        method: 'POST',
        body: {
          issue_id: 'issue-rail',
          suggestion_text: `Suggestion ${i}`,
        },
      });
      await postSuggestion(req);
    }

    const request = createTestRequest('/api/suggestions', {
      method: 'POST',
      body: {
        issue_id: 'issue-rail',
        suggestion_text: 'One too many',
      },
    });
    const response = await postSuggestion(request);
    expect(response.status).toBe(429);
  });
});
