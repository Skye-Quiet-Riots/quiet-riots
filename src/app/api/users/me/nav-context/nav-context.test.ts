import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { GET } from './route';

// Mock session
const mockSession = vi.fn().mockResolvedValue('user-sarah');
vi.mock('@/lib/session', () => ({
  getSession: () => mockSession(),
}));

// Mock email (needed by seed-test-data transitive imports)
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('GET /api/users/me/nav-context', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
  });

  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns nav context for authenticated user', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty('unreadCount');
    expect(body.data).toHaveProperty('roles');
    expect(body.data).toHaveProperty('walletBalance');
    expect(body.data).toHaveProperty('walletCurrency');
  });

  it('returns correct wallet balance for user-sarah', async () => {
    const res = await GET();
    const body = await res.json();
    // user-sarah has 500 pence in wallet
    expect(body.data.walletBalance).toBe(500);
  });

  it('returns roles array for user-sarah', async () => {
    const res = await GET();
    const body = await res.json();
    // user-sarah has setup_guide role
    expect(body.data.roles).toContain('setup_guide');
  });

  it('returns unreadCount as a number', async () => {
    const res = await GET();
    const body = await res.json();
    expect(typeof body.data.unreadCount).toBe('number');
  });

  it('sets private cache headers', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Vary')).toBe('Cookie');
  });

  it('returns null wallet when user has no wallet', async () => {
    // user-marcio has no wallet in seed data
    mockSession.mockResolvedValueOnce('user-marcio');
    const res = await GET();
    const body = await res.json();
    expect(body.data.walletBalance).toBeNull();
    expect(body.data.walletCurrency).toBeNull();
  });
});
