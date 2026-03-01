import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';
import { GET } from './route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(() => {
  _resetRateLimitStore();
});

function searchRequest(params: string) {
  return new NextRequest(`http://localhost:3000/api/search?${params}`);
}

describe('GET /api/search', () => {
  it('returns issues and organisations matching the query', async () => {
    const res = await GET(searchRequest('q=Rail'));
    const { ok, data } = await res.json();
    expect(res.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.issues).toBeDefined();
    expect(data.organisations).toBeDefined();
    // "Rail" matches issue "Rail Cancellations" and org "Southern Rail"
    expect(data.issues.length).toBeGreaterThanOrEqual(1);
    expect(data.issues[0].name).toContain('Rail');
    expect(data.organisations.length).toBeGreaterThanOrEqual(1);
    expect(data.organisations[0].name).toContain('Rail');
  });

  it('returns empty results for non-matching query', async () => {
    const res = await GET(searchRequest('q=xyznonexistent'));
    const { ok, data } = await res.json();
    expect(res.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.issues).toHaveLength(0);
    expect(data.organisations).toHaveLength(0);
  });

  it('returns 400 when query is missing', async () => {
    const res = await GET(searchRequest(''));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when query is too short for Latin locale', async () => {
    const res = await GET(searchRequest('q=ab'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('3 characters');
  });

  it('allows 1-character query for CJK locales', async () => {
    // For CJK, single character is valid
    const res = await GET(searchRequest('q=a&locale=zh-CN'));
    // Should not return 400 — the query "a" won't match much but is valid
    expect(res.status).toBe(200);
  });

  it('limits results to 5 per type', async () => {
    // With only 3 test issues, we can't test the cap directly,
    // but verify the structure is correct
    const res = await GET(searchRequest('q=Rail'));
    const { data } = await res.json();
    expect(data.issues.length).toBeLessThanOrEqual(5);
    expect(data.organisations.length).toBeLessThanOrEqual(5);
  });

  it('sets Cache-Control header', async () => {
    const res = await GET(searchRequest('q=Rail'));
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=30');
  });

  it('handles locale parameter', async () => {
    const res = await GET(searchRequest('q=Rail&locale=es'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    // Results should still be returned (Spanish translations overlay)
    expect(data.issues).toBeDefined();
    expect(data.organisations).toBeDefined();
  });

  it('rate limits after 30 requests', async () => {
    for (let i = 0; i < 30; i++) {
      const res = await GET(searchRequest('q=Rail'));
      expect(res.status).toBe(200);
    }
    const res = await GET(searchRequest('q=Rail'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('matches by synonym', async () => {
    // Seed a synonym for testing
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO synonyms (id, issue_id, term) VALUES ('syn-train', 'issue-rail', 'train delays')",
      args: [],
    });

    const res = await GET(searchRequest('q=train+delays'));
    const { data } = await res.json();
    expect(data.issues.some((i: { id: string }) => i.id === 'issue-rail')).toBe(true);
  });

  it('rejects invalid locale gracefully', async () => {
    const res = await GET(searchRequest('q=Rail&locale=invalid'));
    // Should still work, just without translations
    expect(res.status).toBe(200);
  });
});
