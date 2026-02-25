import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { assignRole, removeRole, hasRole, hasAnyRole, getUserRoles, getUsersByRole } from './roles';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('assignRole', () => {
  it('assigns a role to a user', async () => {
    const role = await assignRole('user-marcio', 'setup_guide', 'user-admin');
    expect(role.user_id).toBe('user-marcio');
    expect(role.role).toBe('setup_guide');
    expect(role.assigned_by).toBe('user-admin');
    expect(role.id).toBeTruthy();
    expect(role.created_at).toBeTruthy();
  });

  it('is idempotent — assigning same role twice does not throw', async () => {
    // user-sarah already has setup_guide from seed data
    const role = await assignRole('user-sarah', 'setup_guide', 'user-admin');
    expect(role.user_id).toBe('user-sarah');
    expect(role.role).toBe('setup_guide');
  });

  it('allows a user to have multiple roles', async () => {
    await assignRole('user-sarah', 'administrator', 'user-admin');
    const roles = await getUserRoles('user-sarah');
    expect(roles.length).toBeGreaterThanOrEqual(2);
    const roleNames = roles.map((r) => r.role);
    expect(roleNames).toContain('setup_guide');
    expect(roleNames).toContain('administrator');
  });
});

describe('removeRole', () => {
  it('removes a role and returns true', async () => {
    await assignRole('user-marcio', 'administrator');
    const removed = await removeRole('user-marcio', 'administrator');
    expect(removed).toBe(true);
    const stillHas = await hasRole('user-marcio', 'administrator');
    expect(stillHas).toBe(false);
  });

  it('returns false when role does not exist', async () => {
    const removed = await removeRole('user-new', 'administrator');
    expect(removed).toBe(false);
  });
});

describe('hasRole', () => {
  it('returns true when user has the role', async () => {
    const result = await hasRole('user-sarah', 'setup_guide');
    expect(result).toBe(true);
  });

  it('returns false when user does not have the role', async () => {
    const result = await hasRole('user-new', 'setup_guide');
    expect(result).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('returns true when user has at least one of the roles', async () => {
    const result = await hasAnyRole('user-sarah', ['setup_guide', 'administrator']);
    expect(result).toBe(true);
  });

  it('returns false when user has none of the roles', async () => {
    const result = await hasAnyRole('user-new', ['setup_guide', 'administrator']);
    expect(result).toBe(false);
  });

  it('returns false for empty roles array', async () => {
    const result = await hasAnyRole('user-sarah', []);
    expect(result).toBe(false);
  });
});

describe('getUserRoles', () => {
  it('returns all roles for a user', async () => {
    const roles = await getUserRoles('user-admin');
    expect(roles.length).toBeGreaterThanOrEqual(1);
    expect(roles[0].role).toBe('administrator');
  });

  it('returns empty array for user with no roles', async () => {
    const roles = await getUserRoles('user-new');
    expect(roles).toEqual([]);
  });
});

describe('getUsersByRole', () => {
  it('returns all users with setup_guide role', async () => {
    const roles = await getUsersByRole('setup_guide');
    expect(roles.length).toBeGreaterThanOrEqual(1);
    const userIds = roles.map((r) => r.user_id);
    expect(userIds).toContain('user-sarah');
  });

  it('returns all users with administrator role', async () => {
    const roles = await getUsersByRole('administrator');
    const userIds = roles.map((r) => r.user_id);
    expect(userIds).toContain('user-admin');
  });
});
