import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { TursoAdapter } from './auth-adapter';
import { getDb } from './db';
import { generateId } from './uuid';

describe('TursoAdapter', () => {
  let adapter: ReturnType<typeof TursoAdapter>;

  beforeAll(async () => {
    await setupTestDb();
    adapter = TursoAdapter();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('createUser', () => {
    it('creates a user with normalized email', async () => {
      const user = await adapter.createUser({
        email: 'Test@Example.COM',
        emailVerified: null,
        name: 'Test User',
        id: '',
        image: null,
      });

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.id).toBeTruthy();
    });

    it('creates a user with email verification', async () => {
      const user = await adapter.createUser({
        email: 'verified@example.com',
        emailVerified: new Date(),
        name: 'Verified User',
        id: '',
        image: null,
      });

      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT email_verified FROM users WHERE id = ?',
        args: [user.id],
      });
      expect(result.rows[0].email_verified).toBe(1);
    });
  });

  describe('getUserByEmail', () => {
    it('finds users case-insensitively', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [id, 'Case Test', 'case.test@example.com'],
      });

      const found = await adapter.getUserByEmail('CASE.TEST@EXAMPLE.COM');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(id);
    });

    it('excludes deleted users', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'deleted')",
        args: [id, 'Deleted User', 'deleted@example.com'],
      });

      const found = await adapter.getUserByEmail('deleted@example.com');
      expect(found).toBeNull();
    });
  });

  describe('getUserByAccount', () => {
    it('finds user by OAuth provider and account ID', async () => {
      const db = getDb();
      const userId = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId, 'OAuth User', 'oauth.test@example.com'],
      });

      const accountId = generateId();
      await db.execute({
        sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'g-12345', 'oauth')",
        args: [accountId, userId],
      });

      const found = await adapter.getUserByAccount({
        provider: 'google',
        providerAccountId: 'g-12345',
      });
      expect(found).not.toBeNull();
      expect(found!.id).toBe(userId);
    });

    it('excludes deleted users from account lookup', async () => {
      const db = getDb();
      const userId = generateId();
      await db.execute({
        sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'deleted')",
        args: [userId, 'Deleted OAuth', 'deleted.oauth@example.com'],
      });

      await db.execute({
        sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'g-deleted', 'oauth')",
        args: [generateId(), userId],
      });

      const found = await adapter.getUserByAccount({
        provider: 'google',
        providerAccountId: 'g-deleted',
      });
      expect(found).toBeNull();
    });
  });

  describe('linkAccount / unlinkAccount', () => {
    it('links and unlinks an OAuth account', async () => {
      const db = getDb();
      const userId = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId, 'Link Test', 'link.test@example.com'],
      });

      await adapter.linkAccount({
        userId,
        provider: 'facebook',
        providerAccountId: 'fb-999',
        type: 'oauth',
      });

      const result = await db.execute({
        sql: "SELECT * FROM accounts WHERE provider = 'facebook' AND provider_account_id = 'fb-999'",
        args: [],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].user_id).toBe(userId);

      await adapter.unlinkAccount({ provider: 'facebook', providerAccountId: 'fb-999' });
      const after = await db.execute({
        sql: "SELECT * FROM accounts WHERE provider = 'facebook' AND provider_account_id = 'fb-999'",
        args: [],
      });
      expect(after.rows).toHaveLength(0);
    });
  });

  describe('deleteUser', () => {
    it('soft-deletes the user (sets status to deleted)', async () => {
      const db = getDb();
      const userId = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId, 'To Delete', 'to.delete@example.com'],
      });

      await adapter.deleteUser(userId);

      const result = await db.execute({
        sql: 'SELECT status, deactivated_at FROM users WHERE id = ?',
        args: [userId],
      });
      expect(result.rows[0].status).toBe('deleted');
      expect(result.rows[0].deactivated_at).toBeTruthy();
    });
  });

  describe('verification tokens', () => {
    it('creates and uses a verification token', async () => {
      const token = {
        identifier: 'verify@example.com',
        token: 'test-token-' + generateId(),
        expires: new Date(Date.now() + 3600000),
      };

      await adapter.createVerificationToken(token);

      const used = await adapter.useVerificationToken({
        identifier: token.identifier,
        token: token.token,
      });
      expect(used).not.toBeNull();
      expect(used!.identifier).toBe(token.identifier);
      expect(used!.token).toBe(token.token);

      // Token should be consumed — using again returns null
      const reuse = await adapter.useVerificationToken({
        identifier: token.identifier,
        token: token.token,
      });
      expect(reuse).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('updates user fields', async () => {
      const created = await adapter.createUser({
        email: 'update.test@example.com',
        emailVerified: null,
        name: 'Original',
        id: '',
        image: null,
      });

      const updated = await adapter.updateUser({
        id: created.id,
        name: 'Updated Name',
        emailVerified: new Date(),
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.emailVerified).not.toBeNull();
    });
  });
});
