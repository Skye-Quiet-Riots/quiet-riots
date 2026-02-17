import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { GET as getIssues } from './route';
import { GET as getIssueDetail } from './[id]/route';
import { GET as getActions } from './[id]/actions/route';
import { GET as getSynonyms, POST as postSynonym } from './[id]/synonyms/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('GET /api/issues', () => {
  it('returns all issues', async () => {
    const request = new NextRequest('http://localhost:3000/api/issues');
    const response = await getIssues(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveLength(3);
  });

  it('filters by category', async () => {
    const request = new NextRequest('http://localhost:3000/api/issues?category=Transport');
    const response = await getIssues(request);
    const { data } = await response.json();
    expect(data).toHaveLength(2);
    expect(data.every((i: { category: string }) => i.category === 'Transport')).toBe(true);
  });

  it('filters by search', async () => {
    const request = new NextRequest('http://localhost:3000/api/issues?search=Rail');
    const response = await getIssues(request);
    const { data } = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Rail Cancellations');
  });
});

describe('GET /api/issues/[id]', () => {
  it('returns issue with health, countries, pivotOrgs', async () => {
    const request = new Request('http://localhost:3000/api/issues/1');
    const response = await getIssueDetail(request, {
      params: Promise.resolve({ id: 'issue-rail' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.issue.name).toBe('Rail Cancellations');
    expect(data.health).not.toBeNull();
    expect(data.countries).toBeDefined();
    expect(data.pivotOrgs).toBeDefined();
  });

  it('returns 404 for missing issue', async () => {
    const request = new Request('http://localhost:3000/api/issues/999');
    const response = await getIssueDetail(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });
});

describe('GET /api/issues/[id]/actions', () => {
  it('returns actions for an issue', async () => {
    const request = new NextRequest('http://localhost:3000/api/issues/1/actions');
    const response = await getActions(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by type', async () => {
    const request = new NextRequest('http://localhost:3000/api/issues/1/actions?type=idea');
    const response = await getActions(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(data.every((a: { type: string }) => a.type === 'idea')).toBe(true);
  });
});

describe('GET/POST /api/issues/[id]/synonyms', () => {
  it('returns synonyms', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/synonyms');
    const response = await getSynonyms(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a new synonym', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/synonyms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term: 'train problems' }),
    });
    const response = await postSynonym(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.term).toBe('train problems');
  });

  it('returns 400 when term is empty', async () => {
    const request = new Request('http://localhost:3000/api/issues/1/synonyms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term: '  ' }),
    });
    const response = await postSynonym(request, { params: Promise.resolve({ id: 'issue-rail' }) });
    expect(response.status).toBe(400);
  });
});
