import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, getDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { seedTestData } from '@/test/seed-test-data';
import { createTestRequest } from '@/test/api-helpers';
import { hashPassword } from '@/lib/password';
import { POST } from './route';

// Mock session
const mockSession = vi.fn().mockResolvedValue('user-sarah');
vi.mock('@/lib/session', () => ({
  getSession: () => mockSession(),
  setSession: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock HIBP
vi.mock('@/lib/password', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/password')>();
  return {
    ...original,
    isPasswordBreached: vi.fn().mockResolvedValue(false),
  };
});

describe('Password Management API', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
    await seedTestData();
    vi.clearAllMocks();
    mockSession.mockResolvedValue('user-sarah');
  });

  it('sets password for user without one', async () => {
    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'myNewSecurePassword123' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.data.set).toBe(true);

    // Verify password hash is set
    const db = getDb();
    const user = await db.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ?',
      args: ['user-sarah'],
    });
    expect(user.rows[0].password_hash).toBeTruthy();
  });

  it('changes password with correct current password', async () => {
    // Set initial password
    const db = getDb();
    const hash = await hashPassword('oldPassword123');
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [hash, 'user-sarah'],
    });

    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: {
        currentPassword: 'oldPassword123',
        newPassword: 'newSecurePassword456',
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.data.changed).toBe(true);
  });

  it('rejects change without current password', async () => {
    const db = getDb();
    const hash = await hashPassword('oldPassword123');
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [hash, 'user-sarah'],
    });

    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'newSecurePassword456' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it('rejects wrong current password', async () => {
    const db = getDb();
    const hash = await hashPassword('oldPassword123');
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [hash, 'user-sarah'],
    });

    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: {
        currentPassword: 'wrongPassword',
        newPassword: 'newSecurePassword456',
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(data.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects short new password', async () => {
    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'short' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it('rejects breached password', async () => {
    const { isPasswordBreached } = await import('@/lib/password');
    (isPasswordBreached as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'breachedPassword123' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(data.code).toBe('PASSWORD_BREACHED');
  });

  it('bumps session_version on password change', async () => {
    const db = getDb();
    const before = await db.execute({
      sql: 'SELECT session_version FROM users WHERE id = ?',
      args: ['user-sarah'],
    });
    const versionBefore = before.rows[0].session_version as number;

    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'myNewSecurePassword123' },
    });
    await POST(req);

    const after = await db.execute({
      sql: 'SELECT session_version FROM users WHERE id = ?',
      args: ['user-sarah'],
    });
    const versionAfter = after.rows[0].session_version as number;
    expect(versionAfter).toBe(versionBefore + 1);
  });

  it('sends notification email', async () => {
    const { sendEmail } = await import('@/lib/email');
    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'myNewSecurePassword123' },
    });
    await POST(req);

    await new Promise((r) => setTimeout(r, 10));
    expect(sendEmail).toHaveBeenCalledWith(
      'sarah@example.com',
      expect.stringContaining('set'),
      expect.stringContaining('password'),
    );
  });

  it('rejects unauthenticated request', async () => {
    mockSession.mockResolvedValue(null);
    const req = createTestRequest('/api/users/me/password', {
      method: 'POST',
      body: { newPassword: 'myNewSecurePassword123' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(res.status).toBe(401);
  });
});
