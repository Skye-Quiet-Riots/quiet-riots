import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';

describe('Global rearchitecture tables (Phase 0)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ─── Users table expansion ──────────────────────────────────────────────

  describe('users table — new columns', () => {
    it('creates a user with all new profile fields', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: `INSERT INTO users (id, name, email, first_name, last_name, display_name, bio, avatar_url, date_of_birth, country_code, language_code)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          'Test User',
          'test@example.com',
          'Test',
          'User',
          'TestUser',
          'A short bio',
          'https://example.com/avatar.jpg',
          '1990-05-15',
          'GB',
          'en',
        ],
      });

      const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      const user = result.rows[0];
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.display_name).toBe('TestUser');
      expect(user.bio).toBe('A short bio');
      expect(user.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(user.date_of_birth).toBe('1990-05-15');
      expect(user.country_code).toBe('GB');
      expect(user.language_code).toBe('en');
    });

    it('defaults language_code to en', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [id, 'Minimal User', 'minimal@example.com'],
      });

      const result = await db.execute({
        sql: 'SELECT language_code FROM users WHERE id = ?',
        args: [id],
      });
      expect(result.rows[0].language_code).toBe('en');
    });

    it('defaults status to active', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [id, 'Active User', 'active@example.com'],
      });

      const result = await db.execute({
        sql: 'SELECT status, session_version FROM users WHERE id = ?',
        args: [id],
      });
      expect(result.rows[0].status).toBe('active');
      expect(result.rows[0].session_version).toBe(1);
    });

    it('rejects invalid status values', async () => {
      const db = getDb();
      const id = generateId();
      await expect(
        db.execute({
          sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'banned')",
          args: [id, 'Bad Status', 'bad@example.com'],
        }),
      ).rejects.toThrow();
    });

    it('enforces bio length limit of 300 chars', async () => {
      const db = getDb();
      const id = generateId();
      const longBio = 'x'.repeat(301);
      await expect(
        db.execute({
          sql: 'INSERT INTO users (id, name, email, bio) VALUES (?, ?, ?, ?)',
          args: [id, 'Long Bio', 'longbio@example.com', longBio],
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Languages table ────────────────────────────────────────────────────

  describe('languages table', () => {
    it('inserts and retrieves a language', async () => {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO languages (code, name, native_name, direction) VALUES ('en', 'English', 'English', 'ltr')",
        args: [],
      });

      const result = await db.execute("SELECT * FROM languages WHERE code = 'en'");
      expect(result.rows[0].name).toBe('English');
      expect(result.rows[0].native_name).toBe('English');
      expect(result.rows[0].direction).toBe('ltr');
    });

    it('supports RTL languages', async () => {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO languages (code, name, native_name, direction) VALUES ('ar', 'Arabic', 'العربية', 'rtl')",
        args: [],
      });

      const result = await db.execute("SELECT * FROM languages WHERE code = 'ar'");
      expect(result.rows[0].direction).toBe('rtl');
    });

    it('rejects invalid direction values', async () => {
      const db = getDb();
      await expect(
        db.execute({
          sql: "INSERT INTO languages (code, name, native_name, direction) VALUES ('xx', 'Test', 'Test', 'invalid')",
          args: [],
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Countries table ────────────────────────────────────────────────────

  describe('countries table', () => {
    it('inserts and retrieves a country with language reference', async () => {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO countries (code, name, default_language, currency_code, phone_prefix) VALUES ('GB', 'United Kingdom', 'en', 'GBP', '+44')",
        args: [],
      });

      const result = await db.execute("SELECT * FROM countries WHERE code = 'GB'");
      expect(result.rows[0].name).toBe('United Kingdom');
      expect(result.rows[0].currency_code).toBe('GBP');
      expect(result.rows[0].phone_prefix).toBe('+44');
    });
  });

  // ─── Translations table ─────────────────────────────────────────────────

  describe('translations table', () => {
    it('inserts and retrieves a translation', async () => {
      const db = getDb();
      const id = generateId();
      await db.execute({
        sql: "INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source) VALUES (?, 'issue', 'issue-1', 'name', 'ar', 'تأخير القطارات', 'machine')",
        args: [id],
      });

      const result = await db.execute({
        sql: "SELECT * FROM translations WHERE entity_type = 'issue' AND entity_id = 'issue-1' AND language_code = 'ar'",
        args: [],
      });
      expect(result.rows[0].value).toBe('تأخير القطارات');
      expect(result.rows[0].source).toBe('machine');
    });

    it('enforces unique constraint on (entity_type, entity_id, field, language_code)', async () => {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO translations (id, entity_type, entity_id, field, language_code, value) VALUES (?, 'issue', 'issue-dup', 'name', 'en', 'First')",
        args: [generateId()],
      });

      await expect(
        db.execute({
          sql: "INSERT INTO translations (id, entity_type, entity_id, field, language_code, value) VALUES (?, 'issue', 'issue-dup', 'name', 'en', 'Second')",
          args: [generateId()],
        }),
      ).rejects.toThrow();
    });

    it('rejects invalid source values', async () => {
      const db = getDb();
      await expect(
        db.execute({
          sql: "INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source) VALUES (?, 'issue', 'x', 'name', 'en', 'test', 'auto')",
          args: [generateId()],
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Accounts table ─────────────────────────────────────────────────────

  describe('accounts table', () => {
    it('links an OAuth account to a user', async () => {
      const db = getDb();
      const userId = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId, 'OAuth User', 'oauth@example.com'],
      });

      const accountId = generateId();
      await db.execute({
        sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'google-12345', 'oauth')",
        args: [accountId, userId],
      });

      const result = await db.execute({
        sql: 'SELECT * FROM accounts WHERE user_id = ?',
        args: [userId],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].provider).toBe('google');
      expect(result.rows[0].provider_account_id).toBe('google-12345');
    });

    it('enforces unique (provider, provider_account_id)', async () => {
      const db = getDb();
      const userId1 = generateId();
      const userId2 = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId1, 'User 1', 'u1@example.com'],
      });
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId2, 'User 2', 'u2@example.com'],
      });

      await db.execute({
        sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'same-id', 'oauth')",
        args: [generateId(), userId1],
      });

      await expect(
        db.execute({
          sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'same-id', 'oauth')",
          args: [generateId(), userId2],
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Legal documents & user consents ────────────────────────────────────

  describe('legal_documents and user_consents tables', () => {
    it('creates a legal document and records user consent', async () => {
      const db = getDb();

      const docId = generateId();
      await db.execute({
        sql: "INSERT INTO legal_documents (id, country_code, document_type, version, content_url, effective_date) VALUES (?, 'GB', 'terms', '1.0', '/en/terms', '2026-03-01')",
        args: [docId],
      });

      const userId = generateId();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        args: [userId, 'Consent User', 'consent@example.com'],
      });

      const consentId = generateId();
      await db.execute({
        sql: "INSERT INTO user_consents (id, user_id, document_type, version, country_code, ip_address) VALUES (?, ?, 'terms', '1.0', 'GB', '192.168.1.1')",
        args: [consentId, userId],
      });

      const result = await db.execute({
        sql: 'SELECT * FROM user_consents WHERE user_id = ?',
        args: [userId],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].document_type).toBe('terms');
      expect(result.rows[0].version).toBe('1.0');
      expect(result.rows[0].ip_address).toBe('192.168.1.1');
    });

    it('enforces valid document_type values', async () => {
      const db = getDb();
      await expect(
        db.execute({
          sql: "INSERT INTO legal_documents (id, country_code, document_type, version, content_url, effective_date) VALUES (?, 'GB', 'invalid', '1.0', '/x', '2026-01-01')",
          args: [generateId()],
        }),
      ).rejects.toThrow();
    });
  });

  // ─── Verification tokens ────────────────────────────────────────────────

  describe('verification_tokens table', () => {
    it('creates and retrieves a verification token', async () => {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO verification_tokens (identifier, token, expires) VALUES ('test@example.com', 'abc123', '2026-03-01T00:00:00Z')",
        args: [],
      });

      const result = await db.execute({
        sql: "SELECT * FROM verification_tokens WHERE identifier = 'test@example.com'",
        args: [],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].token).toBe('abc123');
    });
  });
});
