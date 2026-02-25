import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { saveUserInterests, getUserInterests } from './interests';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('saveUserInterests', () => {
  it('saves interests for a user', async () => {
    await saveUserInterests('user-sarah', ['Transport', 'Health', 'Education']);
    const interests = await getUserInterests('user-sarah');
    expect(interests).toHaveLength(3);
    expect(interests).toContain('Transport');
    expect(interests).toContain('Health');
    expect(interests).toContain('Education');
  });

  it('replaces existing interests on re-save', async () => {
    await saveUserInterests('user-sarah', ['Banking', 'Tech']);
    const interests = await getUserInterests('user-sarah');
    expect(interests).toHaveLength(2);
    expect(interests).toContain('Banking');
    expect(interests).toContain('Tech');
    expect(interests).not.toContain('Transport');
  });

  it('handles saving a single interest', async () => {
    await saveUserInterests('user-marcio', ['Environment']);
    const interests = await getUserInterests('user-marcio');
    expect(interests).toEqual(['Environment']);
  });

  it('handles all 16 categories', async () => {
    const allCategories = [
      'Transport',
      'Telecoms',
      'Banking',
      'Health',
      'Education',
      'Environment',
      'Energy',
      'Water',
      'Insurance',
      'Housing',
      'Shopping',
      'Delivery',
      'Local',
      'Employment',
      'Tech',
      'Other',
    ];
    await saveUserInterests('user-sarah', allCategories);
    const interests = await getUserInterests('user-sarah');
    expect(interests).toHaveLength(16);
  });
});

describe('getUserInterests', () => {
  it('returns empty array for user with no interests', async () => {
    // user-marcio had interests set above, use a new user
    const { createUser } = await import('./users');
    const user = await createUser({ name: 'New User', email: 'nointerests@example.com' });
    const interests = await getUserInterests(user.id);
    expect(interests).toEqual([]);
  });

  it('returns interests sorted alphabetically by category', async () => {
    await saveUserInterests('user-marcio', ['Water', 'Banking', 'Education']);
    const interests = await getUserInterests('user-marcio');
    expect(interests).toEqual(['Banking', 'Education', 'Water']);
  });
});
