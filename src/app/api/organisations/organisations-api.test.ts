import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { GET as getOrganisations } from './route';
import { GET as getOrgDetail } from './[id]/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('GET /api/organisations', () => {
  it('returns all organisations', async () => {
    const request = new NextRequest('http://localhost:3000/api/organisations');
    const response = await getOrganisations(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('filters by category', async () => {
    const request = new NextRequest('http://localhost:3000/api/organisations?category=Transport');
    const response = await getOrganisations(request);
    const { data } = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Southern Rail');
  });
});

describe('GET /api/organisations/[id]', () => {
  it('returns org with issues and totalRioters', async () => {
    const request = new Request('http://localhost:3000/api/organisations/1');
    const response = await getOrgDetail(request, {
      params: Promise.resolve({ id: 'org-southern' }),
    });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(data.org.name).toBe('Southern Rail');
    expect(data.issues).toBeDefined();
    expect(data.totalRioters).toBeDefined();
  });

  it('returns 404 for missing organisation', async () => {
    const request = new Request('http://localhost:3000/api/organisations/999');
    const response = await getOrgDetail(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
  });
});
