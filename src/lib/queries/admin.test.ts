import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';
import { searchUsers, getUsersWithRoles, getUserCount, getRoleCount } from './admin';
import { createUser } from './users';
import { assignRole } from './roles';

describe('admin queries', () => {
  beforeEach(async () => {
    const db = createClient({ url: ':memory:' });
    _setTestDb(db);
    await dropTables();
    await createTables();
  });

  describe('searchUsers', () => {
    it('finds users by name', async () => {
      await createUser({ name: 'Alice Smith', email: 'alice@example.com' });
      await createUser({ name: 'Bob Jones', email: 'bob@example.com' });

      const results = await searchUsers('alice');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice Smith');
    });

    it('finds users by email', async () => {
      await createUser({ name: 'Alice', email: 'alice@special.com' });
      await createUser({ name: 'Bob', email: 'bob@example.com' });

      const results = await searchUsers('special');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('alice@special.com');
    });

    it('finds users by phone', async () => {
      await createUser({ name: 'Alice', email: 'a@b.com', phone: '+447700900001' });
      await createUser({ name: 'Bob', email: 'b@b.com', phone: '+447700900002' });

      const results = await searchUsers('900001');
      expect(results).toHaveLength(1);
      expect(results[0].phone).toBe('+447700900001');
    });

    it('returns empty array when no match', async () => {
      await createUser({ name: 'Alice', email: 'alice@example.com' });
      const results = await searchUsers('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('respects limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await createUser({ name: `User ${i}`, email: `user${i}@test.com` });
      }
      const results = await searchUsers('User', 2, 1);
      expect(results).toHaveLength(2);
    });
  });

  describe('getUsersWithRoles', () => {
    it('returns users with their roles', async () => {
      const alice = await createUser({ name: 'Alice', email: 'alice@test.com' });
      await assignRole(alice.id, 'setup_guide');
      await assignRole(alice.id, 'administrator');

      const bob = await createUser({ name: 'Bob', email: 'bob@test.com' });
      await assignRole(bob.id, 'setup_guide');

      const results = await getUsersWithRoles();
      expect(results).toHaveLength(2);

      const aliceResult = results.find((r) => r.user.id === alice.id);
      expect(aliceResult!.roles).toHaveLength(2);

      const bobResult = results.find((r) => r.user.id === bob.id);
      expect(bobResult!.roles).toHaveLength(1);
    });

    it('returns empty array when no roles exist', async () => {
      await createUser({ name: 'Alice', email: 'alice@test.com' });
      const results = await getUsersWithRoles();
      expect(results).toHaveLength(0);
    });
  });

  describe('getUserCount', () => {
    it('counts all users', async () => {
      expect(await getUserCount()).toBe(0);
      await createUser({ name: 'Alice', email: 'alice@test.com' });
      await createUser({ name: 'Bob', email: 'bob@test.com' });
      expect(await getUserCount()).toBe(2);
    });
  });

  describe('getRoleCount', () => {
    it('counts users by role', async () => {
      const alice = await createUser({ name: 'Alice', email: 'alice@test.com' });
      const bob = await createUser({ name: 'Bob', email: 'bob@test.com' });
      await assignRole(alice.id, 'setup_guide');
      await assignRole(bob.id, 'setup_guide');
      await assignRole(alice.id, 'administrator');

      expect(await getRoleCount('setup_guide')).toBe(2);
      expect(await getRoleCount('administrator')).toBe(1);
    });
  });
});
