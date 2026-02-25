import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { getDb } from '@/lib/db';
import {
  recordConsent,
  getUserConsents,
  getLatestConsent,
  getLegalDocument,
  getNotificationPreferences,
  updateNotificationPreferences,
  logLoginEvent,
  getLoginEvents,
  deactivateAccount,
  reactivateAccount,
  hardDeleteUser,
  exportUserData,
} from './privacy';

beforeAll(async () => {
  await setupTestDb();
  const db = getDb();

  // Create test users
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-privacy', 'Privacy Test', 'privacy@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-privacy-2', 'Privacy Two', 'privacy2@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-delete-target', 'Delete Me', 'delete@test.com'],
  });
  await db.execute({
    sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
    args: ['user-export-target', 'Export Me', 'export@test.com'],
  });

  // Create a test issue (needed for user_issues, feed, evidence, etc.)
  await db.execute({
    sql: "INSERT INTO issues (id, name, category, description) VALUES (?, ?, 'Transport', 'Test issue')",
    args: ['issue-priv-test', 'Privacy Test Issue'],
  });

  // Create legal documents — country_code has CHECK(length <= 3) so use 'GLO' for global
  // Note: getLegalDocument() hardcodes 'global' in its SQL fallback, which cannot match
  // a row stored as 'GLO' due to the 3-char constraint. We test the country-specific path
  // (which works) and document that the global fallback is currently unreachable.
  await db.execute({
    sql: `INSERT INTO legal_documents (id, country_code, document_type, version, content_url, effective_date)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['doc-gb-terms', 'GB', 'terms', '1.0', 'https://example.com/terms/gb', '2025-01-01'],
  });
  await db.execute({
    sql: `INSERT INTO legal_documents (id, country_code, document_type, version, content_url, effective_date)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'doc-gb-privacy',
      'GB',
      'privacy',
      '2.0',
      'https://example.com/privacy/gb',
      '2025-06-01',
    ],
  });
  await db.execute({
    sql: `INSERT INTO legal_documents (id, country_code, document_type, version, content_url, effective_date)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['doc-us-terms', 'US', 'terms', '1.0', 'https://example.com/terms/us', '2025-03-01'],
  });
});

afterAll(async () => {
  await teardownTestDb();
});

// ---------- recordConsent ----------

describe('recordConsent', () => {
  it('creates a consent record with all fields', async () => {
    const consent = await recordConsent(
      'user-privacy',
      'terms',
      '1.0',
      'GB',
      '192.168.1.1',
      'TestAgent/1.0',
    );
    expect(consent.id).toBeDefined();
    expect(consent.user_id).toBe('user-privacy');
    expect(consent.document_type).toBe('terms');
    expect(consent.version).toBe('1.0');
    expect(consent.country_code).toBe('GB');
    expect(consent.ip_address).toBe('192.168.1.1');
    expect(consent.user_agent).toBe('TestAgent/1.0');
    expect(consent.accepted_at).toBeDefined();
  });

  it('creates a consent record without optional fields', async () => {
    const consent = await recordConsent('user-privacy', 'privacy', '2.0', 'US');
    expect(consent.ip_address).toBeNull();
    expect(consent.user_agent).toBeNull();
    expect(consent.document_type).toBe('privacy');
  });

  it('allows multiple consents of the same type for a user', async () => {
    await recordConsent('user-privacy', 'cookie', '1.0', 'GB');
    await recordConsent('user-privacy', 'cookie', '1.1', 'GB');
    const consents = await getUserConsents('user-privacy');
    const cookieConsents = consents.filter((c) => c.document_type === 'cookie');
    expect(cookieConsents.length).toBe(2);
  });
});

// ---------- getUserConsents ----------

describe('getUserConsents', () => {
  it('returns all consents for a user ordered by date descending', async () => {
    const consents = await getUserConsents('user-privacy');
    expect(consents.length).toBeGreaterThanOrEqual(3);
    // Verify ordering — most recent first
    for (let i = 1; i < consents.length; i++) {
      expect(consents[i - 1].accepted_at >= consents[i].accepted_at).toBe(true);
    }
  });

  it('returns empty array for user with no consents', async () => {
    const consents = await getUserConsents('user-privacy-2');
    expect(consents).toEqual([]);
  });
});

// ---------- getLatestConsent ----------

describe('getLatestConsent', () => {
  it('returns the most recent consent for a given type', async () => {
    // Insert with explicit timestamps to ensure deterministic ordering
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO user_consents (id, user_id, document_type, version, country_code, accepted_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['consent-latest-old', 'user-privacy', 'analytics', '1.0', 'GB', '2025-01-01T00:00:00'],
    });
    await db.execute({
      sql: `INSERT INTO user_consents (id, user_id, document_type, version, country_code, accepted_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['consent-latest-new', 'user-privacy', 'analytics', '2.0', 'GB', '2025-06-01T00:00:00'],
    });

    const consent = await getLatestConsent('user-privacy', 'analytics');
    expect(consent).not.toBeNull();
    expect(consent!.document_type).toBe('analytics');
    expect(consent!.version).toBe('2.0'); // The newer one by accepted_at
  });

  it('returns null when user has consents but not for the requested type', async () => {
    // Give user-privacy-2 a single 'terms' consent, then look for 'analytics'
    await recordConsent('user-privacy-2', 'terms', '1.0', 'GB');
    const consent = await getLatestConsent('user-privacy-2', 'analytics');
    expect(consent).toBeNull();
  });

  it('returns null for user with no consents at all', async () => {
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
      args: ['user-no-consents', 'No Consents', 'noconsents@test.com'],
    });
    const consent = await getLatestConsent('user-no-consents', 'terms');
    expect(consent).toBeNull();
  });
});

// ---------- getLegalDocument ----------

describe('getLegalDocument', () => {
  it('returns country-specific document when available', async () => {
    const doc = await getLegalDocument('GB', 'terms');
    expect(doc).not.toBeNull();
    expect(doc!.country_code).toBe('GB');
    expect(doc!.content_url).toBe('https://example.com/terms/gb');
  });

  it('returns null when no document exists for the country or global', async () => {
    // FR has no terms doc and 'global' cannot be stored (schema limits to 3 chars)
    const doc = await getLegalDocument('FR', 'terms');
    expect(doc).toBeNull();
  });

  it('returns null for a document type with no rows at all', async () => {
    const doc = await getLegalDocument('GB', 'cookie');
    expect(doc).toBeNull();
  });

  it('returns correct document when multiple countries have the same type', async () => {
    const gbDoc = await getLegalDocument('GB', 'terms');
    const usDoc = await getLegalDocument('US', 'terms');
    expect(gbDoc).not.toBeNull();
    expect(usDoc).not.toBeNull();
    expect(gbDoc!.country_code).toBe('GB');
    expect(usDoc!.country_code).toBe('US');
    expect(gbDoc!.content_url).not.toBe(usDoc!.content_url);
  });
});

// ---------- getNotificationPreferences ----------

describe('getNotificationPreferences', () => {
  it('creates defaults on first call', async () => {
    const prefs = await getNotificationPreferences('user-privacy');
    expect(prefs.user_id).toBe('user-privacy');
    expect(prefs.security).toBe(1);
    expect(prefs.product_updates).toBe(1);
    expect(prefs.campaign_updates).toBe(1);
    expect(prefs.weekly_digest).toBe(0);
  });

  it('returns existing preferences on subsequent call', async () => {
    const prefs1 = await getNotificationPreferences('user-privacy');
    const prefs2 = await getNotificationPreferences('user-privacy');
    expect(prefs1.security).toBe(prefs2.security);
    expect(prefs1.weekly_digest).toBe(prefs2.weekly_digest);
  });
});

// ---------- updateNotificationPreferences ----------

describe('updateNotificationPreferences', () => {
  it('updates only the specified fields', async () => {
    const updated = await updateNotificationPreferences('user-privacy', {
      weekly_digest: 1,
    });
    expect(updated.weekly_digest).toBe(1);
    // Other fields should remain at defaults
    expect(updated.security).toBe(1);
    expect(updated.product_updates).toBe(1);
    expect(updated.campaign_updates).toBe(1);
  });

  it('updates multiple fields at once', async () => {
    const updated = await updateNotificationPreferences('user-privacy', {
      security: 0,
      product_updates: 0,
    });
    expect(updated.security).toBe(0);
    expect(updated.product_updates).toBe(0);
    // Other fields unchanged
    expect(updated.weekly_digest).toBe(1);
    expect(updated.campaign_updates).toBe(1);
  });

  it('creates defaults first for a new user then updates', async () => {
    const updated = await updateNotificationPreferences('user-privacy-2', {
      campaign_updates: 0,
    });
    expect(updated.user_id).toBe('user-privacy-2');
    expect(updated.campaign_updates).toBe(0);
    // Defaults for the rest
    expect(updated.security).toBe(1);
    expect(updated.product_updates).toBe(1);
    expect(updated.weekly_digest).toBe(0);
  });

  it('handles empty update (no fields) gracefully', async () => {
    const updated = await updateNotificationPreferences('user-privacy', {});
    expect(updated.user_id).toBe('user-privacy');
    // Should return current values unchanged
    expect(updated.security).toBe(0);
  });
});

// ---------- logLoginEvent ----------

describe('logLoginEvent', () => {
  it('creates a login event with all fields', async () => {
    const event = await logLoginEvent('user-privacy', 'login', '10.0.0.1', 'Mozilla/5.0', 'google');
    expect(event.id).toBeDefined();
    expect(event.user_id).toBe('user-privacy');
    expect(event.event_type).toBe('login');
    expect(event.ip_address).toBe('10.0.0.1');
    expect(event.user_agent).toBe('Mozilla/5.0');
    expect(event.provider).toBe('google');
    expect(event.created_at).toBeDefined();
  });

  it('creates an event without optional fields', async () => {
    const event = await logLoginEvent('user-privacy', 'logout');
    expect(event.ip_address).toBeNull();
    expect(event.user_agent).toBeNull();
    expect(event.provider).toBeNull();
    expect(event.event_type).toBe('logout');
  });

  it('allows null user_id for failed login attempts', async () => {
    const event = await logLoginEvent(null, 'failed_login', '1.2.3.4');
    expect(event.user_id).toBeNull();
    expect(event.event_type).toBe('failed_login');
    expect(event.ip_address).toBe('1.2.3.4');
  });
});

// ---------- getLoginEvents ----------

describe('getLoginEvents', () => {
  it('returns events for a user ordered by date descending', async () => {
    const events = await getLoginEvents('user-privacy');
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].created_at >= events[i].created_at).toBe(true);
    }
  });

  it('respects the limit parameter', async () => {
    // Add a few more events
    await logLoginEvent('user-privacy', 'login', '10.0.0.2');
    await logLoginEvent('user-privacy', 'logout', '10.0.0.2');
    await logLoginEvent('user-privacy', 'login', '10.0.0.3');

    const events = await getLoginEvents('user-privacy', 2);
    expect(events.length).toBe(2);
  });

  it('returns empty array for user with no events', async () => {
    const events = await getLoginEvents('user-privacy-2');
    expect(events).toEqual([]);
  });
});

// ---------- deactivateAccount ----------

describe('deactivateAccount', () => {
  it('sets status to deactivated and populates deactivated_at', async () => {
    const user = await deactivateAccount('user-privacy-2');
    expect(user).not.toBeNull();
    expect(user!.status).toBe('deactivated');
    expect(user!.deactivated_at).not.toBeNull();
  });

  it('returns null for non-existent user', async () => {
    const user = await deactivateAccount('user-nonexistent');
    expect(user).toBeNull();
  });
});

// ---------- reactivateAccount ----------

describe('reactivateAccount', () => {
  it('sets status back to active and clears deactivated_at', async () => {
    // user-privacy-2 was deactivated in the previous test
    const user = await reactivateAccount('user-privacy-2');
    expect(user).not.toBeNull();
    expect(user!.status).toBe('active');
    expect(user!.deactivated_at).toBeNull();
  });

  it('returns null for non-existent user', async () => {
    const user = await reactivateAccount('user-nonexistent');
    expect(user).toBeNull();
  });

  it('is idempotent — reactivating an active user stays active', async () => {
    const user = await reactivateAccount('user-privacy-2');
    expect(user!.status).toBe('active');
    expect(user!.deactivated_at).toBeNull();
  });
});

// ---------- hardDeleteUser ----------

describe('hardDeleteUser', () => {
  beforeAll(async () => {
    const db = getDb();
    const userId = 'user-delete-target';

    // Populate data across many tables for this user
    await db.execute({
      sql: 'INSERT INTO user_consents (id, user_id, document_type, version, country_code) VALUES (?, ?, ?, ?, ?)',
      args: ['consent-del-1', userId, 'terms', '1.0', 'GB'],
    });
    await db.execute({
      sql: 'INSERT INTO notification_preferences (user_id, security, product_updates, campaign_updates, weekly_digest) VALUES (?, 1, 1, 1, 0)',
      args: [userId],
    });
    await db.execute({
      sql: 'INSERT INTO login_events (id, user_id, event_type) VALUES (?, ?, ?)',
      args: ['login-del-1', userId, 'login'],
    });
    await db.execute({
      sql: 'INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)',
      args: ['ui-del-1', userId, 'issue-priv-test'],
    });
    await db.execute({
      sql: 'INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)',
      args: ['feed-del-1', 'issue-priv-test', userId, 'Test feed post'],
    });
    await db.execute({
      sql: "INSERT INTO evidence (id, issue_id, user_id, content, media_type) VALUES (?, ?, ?, ?, 'text')",
      args: ['ev-del-1', 'issue-priv-test', userId, 'Test evidence'],
    });
    await db.execute({
      sql: 'INSERT INTO evidence_comments (id, evidence_id, user_id, content) VALUES (?, ?, ?, ?)',
      args: ['ec-del-1', 'ev-del-1', userId, 'Test comment'],
    });
    await db.execute({
      sql: "INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence, currency) VALUES (?, ?, 500, 1000, 500, 'GBP')",
      args: ['wallet-del', userId],
    });
    await db.execute({
      sql: "INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence) VALUES (?, ?, 'topup', 1000)",
      args: ['wtx-del-1', 'wallet-del'],
    });
    await db.execute({
      sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'google', 'goog-123', 'oauth')",
      args: ['acc-del-1', userId],
    });
    await db.execute({
      sql: 'INSERT INTO bot_events (id, action, user_id, status) VALUES (?, ?, ?, ?)',
      args: ['be-del-1', 'search_issues', userId, 'ok'],
    });
    await db.execute({
      sql: 'INSERT INTO user_assistant_introductions (user_id, category) VALUES (?, ?)',
      args: [userId, 'transport'],
    });
    await db.execute({
      sql: 'INSERT INTO assistant_claims (id, category, user_id, message) VALUES (?, ?, ?, ?)',
      args: ['claim-del-1', 'transport', userId, 'I want to help'],
    });

    // Add a user memory
    await db.execute({
      sql: "INSERT INTO user_memory (id, user_id, memory_key, memory_value, category) VALUES (?, ?, ?, ?, 'context')",
      args: ['mem-del-1', userId, 'test_memory', 'Should be deleted'],
    });

    // Add a riot reel and vote to test reel_votes / reel_shown_log cleanup
    await db.execute({
      sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, source, status)
            VALUES (?, ?, 'https://youtube.com/watch?v=abc', 'abc', 'Test Reel', 'curated', 'approved')`,
      args: ['reel-del-1', 'issue-priv-test'],
    });
    await db.execute({
      sql: 'INSERT INTO reel_votes (reel_id, user_id, vote) VALUES (?, ?, 1)',
      args: ['reel-del-1', userId],
    });
    await db.execute({
      sql: 'INSERT INTO reel_shown_log (user_id, reel_id, issue_id) VALUES (?, ?, ?)',
      args: [userId, 'reel-del-1', 'issue-priv-test'],
    });
  });

  it('deletes all user data from every related table', async () => {
    const db = getDb();
    const userId = 'user-delete-target';

    await hardDeleteUser(userId);

    // Verify user row is gone
    const userRow = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });
    expect(userRow.rows.length).toBe(0);

    // Verify all related tables are clean
    const checks = [
      { table: 'user_memory', column: 'user_id' },
      { table: 'user_consents', column: 'user_id' },
      { table: 'notification_preferences', column: 'user_id' },
      { table: 'login_events', column: 'user_id' },
      { table: 'user_issues', column: 'user_id' },
      { table: 'feed', column: 'user_id' },
      { table: 'evidence_comments', column: 'user_id' },
      { table: 'evidence', column: 'user_id' },
      { table: 'accounts', column: 'user_id' },
      { table: 'user_assistant_introductions', column: 'user_id' },
      { table: 'assistant_claims', column: 'user_id' },
      { table: 'reel_votes', column: 'user_id' },
      { table: 'reel_shown_log', column: 'user_id' },
    ];

    for (const { table, column } of checks) {
      const result = await db.execute({
        sql: `SELECT * FROM ${table} WHERE ${column} = ?`,
        args: [userId],
      });
      expect(result.rows.length).toBe(0);
    }

    // Verify wallet and wallet_transactions are gone
    const wallets = await db.execute({
      sql: 'SELECT * FROM wallets WHERE id = ?',
      args: ['wallet-del'],
    });
    expect(wallets.rows.length).toBe(0);

    const wtx = await db.execute({
      sql: 'SELECT * FROM wallet_transactions WHERE wallet_id = ?',
      args: ['wallet-del'],
    });
    expect(wtx.rows.length).toBe(0);

    // Verify bot_events user_id is nullified (not deleted)
    const botEvents = await db.execute({
      sql: 'SELECT * FROM bot_events WHERE id = ?',
      args: ['be-del-1'],
    });
    expect(botEvents.rows.length).toBe(1);
    expect((botEvents.rows[0] as unknown as { user_id: string | null }).user_id).toBeNull();
  });

  it('does not throw for a user with no related data', async () => {
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
      args: ['user-delete-empty', 'Empty User', 'empty@test.com'],
    });
    // Should not throw
    await hardDeleteUser('user-delete-empty');
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: ['user-delete-empty'],
    });
    expect(result.rows.length).toBe(0);
  });
});

// ---------- exportUserData ----------

describe('exportUserData', () => {
  beforeAll(async () => {
    const db = getDb();
    const userId = 'user-export-target';

    // Populate rich test data for export
    await db.execute({
      sql: 'INSERT INTO user_consents (id, user_id, document_type, version, country_code) VALUES (?, ?, ?, ?, ?)',
      args: ['consent-exp-1', userId, 'terms', '1.0', 'GB'],
    });
    await db.execute({
      sql: 'INSERT INTO user_consents (id, user_id, document_type, version, country_code) VALUES (?, ?, ?, ?, ?)',
      args: ['consent-exp-2', userId, 'privacy', '2.0', 'GB'],
    });
    await db.execute({
      sql: 'INSERT INTO login_events (id, user_id, event_type, ip_address) VALUES (?, ?, ?, ?)',
      args: ['login-exp-1', userId, 'login', '10.0.0.1'],
    });
    await db.execute({
      sql: 'INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)',
      args: ['ui-exp-1', userId, 'issue-priv-test'],
    });
    await db.execute({
      sql: 'INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)',
      args: ['feed-exp-1', 'issue-priv-test', userId, 'My exported post'],
    });
    await db.execute({
      sql: "INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence, currency) VALUES (?, ?, 300, 500, 200, 'GBP')",
      args: ['wallet-exp', userId],
    });
    await db.execute({
      sql: "INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description) VALUES (?, ?, 'topup', 500, 'Top up')",
      args: ['wtx-exp-1', 'wallet-exp'],
    });
    await db.execute({
      sql: "INSERT INTO evidence (id, issue_id, user_id, content, media_type) VALUES (?, ?, ?, ?, 'text')",
      args: ['ev-exp-1', 'issue-priv-test', userId, 'My evidence'],
    });
    await db.execute({
      sql: 'INSERT INTO user_assistant_introductions (user_id, category) VALUES (?, ?)',
      args: [userId, 'banking'],
    });
    await db.execute({
      sql: "INSERT INTO accounts (id, user_id, provider, provider_account_id, type) VALUES (?, ?, 'github', 'gh-456', 'oauth')",
      args: ['acc-exp-1', userId],
    });
    await db.execute({
      sql: "INSERT INTO user_memory (id, user_id, memory_key, memory_value, category) VALUES (?, ?, ?, ?, 'preference')",
      args: ['mem-exp-1', userId, 'preferred_language', 'English with brief messages'],
    });
  });

  it('returns comprehensive data export for a user', async () => {
    const data = await exportUserData('user-export-target');
    expect(data).not.toBeNull();

    // Profile
    expect(data!.profile.id).toBe('user-export-target');
    expect(data!.profile.name).toBe('Export Me');
    expect(data!.profile.email).toBe('export@test.com');

    // Consents
    expect(data!.consents.length).toBe(2);

    // Login events
    expect(data!.loginEvents.length).toBeGreaterThanOrEqual(1);
    expect(data!.loginEvents[0].event_type).toBe('login');

    // Notification preferences (auto-created defaults)
    expect(data!.notificationPreferences.user_id).toBe('user-export-target');
    expect(data!.notificationPreferences.security).toBe(1);

    // Joined issues
    expect(data!.joinedIssues.length).toBe(1);
    expect(data!.joinedIssues[0].issue_name).toBe('Privacy Test Issue');

    // Feed posts
    expect(data!.feedPosts.length).toBe(1);
    expect(data!.feedPosts[0].content).toBe('My exported post');

    // Wallet
    expect(data!.wallet).not.toBeNull();
    expect(data!.wallet!.balance_pence).toBe(300);
    expect(data!.wallet!.currency).toBe('GBP');
    expect(data!.wallet!.transactions.length).toBe(1);

    // Evidence
    expect(data!.evidence.length).toBe(1);
    expect(data!.evidence[0].content).toBe('My evidence');

    // Assistant introductions
    expect(data!.assistantIntroductions.length).toBe(1);
    expect(data!.assistantIntroductions[0].category).toBe('banking');

    // Connected accounts (provider only, no tokens)
    expect(data!.connectedAccounts.length).toBe(1);
    expect(data!.connectedAccounts[0].provider).toBe('github');
    expect(data!.connectedAccounts[0].type).toBe('oauth');

    // Memories
    expect(data!.memories.length).toBe(1);
    expect(data!.memories[0].memory_key).toBe('preferred_language');
    expect(data!.memories[0].memory_value).toBe('English with brief messages');
    expect(data!.memories[0].category).toBe('preference');
  });

  it('returns null for non-existent user', async () => {
    const data = await exportUserData('user-does-not-exist');
    expect(data).toBeNull();
  });

  it('returns export with empty collections for user with minimal data', async () => {
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, 'active')",
      args: ['user-export-minimal', 'Minimal User', 'minimal@test.com'],
    });

    const data = await exportUserData('user-export-minimal');
    expect(data).not.toBeNull();
    expect(data!.profile.name).toBe('Minimal User');
    expect(data!.consents).toEqual([]);
    expect(data!.loginEvents).toEqual([]);
    expect(data!.joinedIssues).toEqual([]);
    expect(data!.feedPosts).toEqual([]);
    expect(data!.wallet).toBeNull();
    expect(data!.evidence).toEqual([]);
    expect(data!.assistantIntroductions).toEqual([]);
    expect(data!.connectedAccounts).toEqual([]);
    expect(data!.memories).toEqual([]);
    // Notification preferences should be auto-created defaults
    expect(data!.notificationPreferences.security).toBe(1);
    expect(data!.notificationPreferences.weekly_digest).toBe(0);
  });
});
