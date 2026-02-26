import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET } from './users/route';
import { POST } from './roles/route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
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

describe('GET /api/admin/users', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockLoggedIn('user-sarah'); // setup_guide, not administrator
    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('returns users with roles and stats for admin', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.users_with_roles).toBeDefined();
    expect(data.data.stats.total_users).toBeGreaterThanOrEqual(3);
    expect(data.data.stats.setup_guides).toBeGreaterThanOrEqual(1);
    expect(data.data.stats.administrators).toBeGreaterThanOrEqual(1);
  });

  it('searches users by name', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/users?search=Sarah');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.users.length).toBeGreaterThanOrEqual(1);
    expect(data.data.users[0].name).toContain('Sarah');
  });

  it('searches users by email', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/users?search=marcio');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.users.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array for no match', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/users?search=zznonexistent');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.users).toHaveLength(0);
  });
});

describe('POST /api/admin/roles', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-new', role: 'setup_guide', action: 'assign' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockLoggedIn('user-sarah');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-new', role: 'setup_guide', action: 'assign' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('assigns a role to a user', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-marcio', role: 'setup_guide', action: 'assign' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.action).toBe('assigned');
    expect(data.data.role.role).toBe('setup_guide');
  });

  it('removes a role from a user', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-marcio', role: 'setup_guide', action: 'remove' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.action).toBe('removed');
  });

  it('rejects removing own admin role', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-admin', role: 'administrator', action: 'remove' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 404 for nonexistent user', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-nonexistent', role: 'setup_guide', action: 'assign' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it('rejects invalid role type', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-new', role: 'invalid_role', action: 'assign' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
