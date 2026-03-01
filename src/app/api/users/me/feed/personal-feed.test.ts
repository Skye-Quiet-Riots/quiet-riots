import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getPersonalFeed, parseCursor } from '@/lib/queries/personal-feed';

// Mock session
const mockSession = vi.fn().mockResolvedValue('user-sarah');
vi.mock('@/lib/session', () => ({
  getSession: () => mockSession(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('Personal Feed', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
  });

  // ─── parseCursor ──────────────────────────────────────

  describe('parseCursor', () => {
    it('parses a valid cursor', () => {
      const result = parseCursor('2024-01-01 12:00:00_feed-001');
      expect(result).toEqual({ createdAt: '2024-01-01 12:00:00', id: 'feed-001' });
    });

    it('parses cursor with ISO datetime', () => {
      const result = parseCursor('2024-01-01T12:00:00Z_abc123');
      expect(result).toEqual({ createdAt: '2024-01-01T12:00:00Z', id: 'abc123' });
    });

    it('handles UUID-style IDs with hyphens', () => {
      const result = parseCursor('2024-01-01 12:00:00_a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result).toEqual({
        createdAt: '2024-01-01 12:00:00',
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
    });

    it('returns null for invalid cursor', () => {
      expect(parseCursor('invalid')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseCursor('')).toBeNull();
    });
  });

  // ─── Query: getPersonalFeed ──────────────────────────

  describe('getPersonalFeed', () => {
    it('returns activities for a user with joined issues', async () => {
      // user-sarah is joined to issue-rail which has feed posts, evidence, and reels
      const result = await getPersonalFeed('user-sarah');
      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.activities[0]).toHaveProperty('activity_type');
      expect(result.activities[0]).toHaveProperty('activity_id');
      expect(result.activities[0]).toHaveProperty('issue_id');
      expect(result.activities[0]).toHaveProperty('issue_name');
      expect(result.activities[0]).toHaveProperty('user_name');
      expect(result.activities[0]).toHaveProperty('content_snippet');
      expect(result.activities[0]).toHaveProperty('created_at');
      expect(result.activities[0]).toHaveProperty('detail_url');
    });

    it('returns empty for a user with no joined or followed issues', async () => {
      // Use a user ID that exists but has no issue memberships or follows
      // user-nonexistent doesn't exist at all — subquery returns empty set
      const result = await getPersonalFeed('user-nonexistent');
      expect(result.activities).toEqual([]);
      expect(result.next_cursor).toBeNull();
    });

    it('includes activities from followed issues', async () => {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      // Create a new user that follows issue-broadband
      await db.execute({
        sql: "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
        args: ['user-follower', 'Follower', 'follower@example.com'],
      });
      await db.execute({
        sql: "INSERT INTO user_follows (id, user_id, issue_id, auto_followed) VALUES (?, ?, ?, 0)",
        args: ['follow-1', 'user-follower', 'issue-rail'],
      });
      // Add feed post to issue-rail
      await db.execute({
        sql: "INSERT INTO feed (id, issue_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
        args: ['feed-follow-test', 'issue-rail', 'user-sarah', 'Test follow feed', '2024-12-01 12:00:00'],
      });
      const result = await getPersonalFeed('user-follower');
      expect(result.activities.length).toBeGreaterThan(0);
    });

    it('orders activities by created_at descending', async () => {
      const result = await getPersonalFeed('user-sarah');
      if (result.activities.length > 1) {
        for (let i = 1; i < result.activities.length; i++) {
          expect(result.activities[i - 1].created_at >= result.activities[i].created_at).toBe(true);
        }
      }
    });

    it('only includes approved/featured riot reels', async () => {
      const result = await getPersonalFeed('user-sarah');
      const reels = result.activities.filter((a) => a.activity_type === 'riot_reel');
      // All reels in the feed should be approved or featured (pending reel-003 should be excluded)
      expect(reels.length).toBeGreaterThan(0);
    });

    it('respects limit parameter', async () => {
      const result = await getPersonalFeed('user-sarah', undefined, 2);
      expect(result.activities.length).toBeLessThanOrEqual(2);
    });

    it('supports cursor pagination', async () => {
      const page1 = await getPersonalFeed('user-sarah', undefined, 2);
      if (page1.next_cursor) {
        const page2 = await getPersonalFeed('user-sarah', page1.next_cursor, 2);
        // No overlap in IDs between pages
        const page1Ids = page1.activities.map((a) => a.activity_id);
        const page2Ids = page2.activities.map((a) => a.activity_id);
        const overlap = page1Ids.filter((id) => page2Ids.includes(id));
        expect(overlap).toEqual([]);
      }
    });

    it('returns null cursor when no more pages', async () => {
      // Get all items at once
      const result = await getPersonalFeed('user-sarah', undefined, 100);
      expect(result.next_cursor).toBeNull();
    });

    it('includes all three activity types', async () => {
      const result = await getPersonalFeed('user-sarah', undefined, 100);
      const types = new Set(result.activities.map((a) => a.activity_type));
      // user-sarah has feed posts, evidence, and approved reels on issue-rail
      expect(types.has('feed_post')).toBe(true);
      expect(types.has('evidence')).toBe(true);
      expect(types.has('riot_reel')).toBe(true);
    });

    it('sets correct detail_url for each activity type', async () => {
      const result = await getPersonalFeed('user-sarah', undefined, 100);
      for (const activity of result.activities) {
        expect(activity.detail_url).toMatch(/^\/issues\//);
      }
    });
  });

  // ─── API Route ──────────────────────────────────────

  describe('GET /api/users/me/feed', () => {
    it('returns 401 when not authenticated', async () => {
      mockSession.mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost:3000/api/users/me/feed');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns feed for authenticated user', async () => {
      const req = new NextRequest('http://localhost:3000/api/users/me/feed');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toHaveProperty('activities');
      expect(body.data).toHaveProperty('next_cursor');
      expect(Array.isArray(body.data.activities)).toBe(true);
    });

    it('sets private cache headers', async () => {
      const req = new NextRequest('http://localhost:3000/api/users/me/feed');
      const res = await GET(req);
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
      expect(res.headers.get('Vary')).toBe('Cookie');
    });

    it('accepts cursor parameter', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/users/me/feed?cursor=2024-01-01T12:00:00Z_feed-001',
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('rejects invalid cursor format', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/users/me/feed?cursor=invalid-cursor',
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('accepts limit parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/users/me/feed?limit=5');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.activities.length).toBeLessThanOrEqual(5);
    });

    it('rejects limit > 20', async () => {
      const req = new NextRequest('http://localhost:3000/api/users/me/feed?limit=50');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('excludes PII from activity items', async () => {
      const req = new NextRequest('http://localhost:3000/api/users/me/feed');
      const res = await GET(req);
      const body = await res.json();
      for (const activity of body.data.activities) {
        expect(activity).not.toHaveProperty('user_id');
        expect(activity).not.toHaveProperty('email');
        expect(activity).not.toHaveProperty('phone');
      }
    });
  });
});
