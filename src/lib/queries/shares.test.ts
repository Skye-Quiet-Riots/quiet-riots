import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';
import {
  checkShareEligibility,
  getOrCreateShareApplication,
  getShareApplication,
  getShareApplicationById,
  promoteToEligible,
  proceedWithShare,
  declineShare,
  withdrawShare,
  reapplyForShare,
  approveShareApplication,
  rejectShareApplication,
  submitIdentity,
  getShareIdentity,
  approveCompliance,
  rejectCompliance,
  forwardToSenior,
  approveSenior,
  rejectSenior,
  createShareMessage,
  getShareMessages,
  getShareAuditLog,
  getShareStatusHistory,
  getShareStats,
  getTreasuryBalance,
  getIdVerificationTier,
  SHARE_COST_PENCE,
  RIOTS_REQUIRED,
  ACTIONS_REQUIRED,
  TREASURY_USER_ID,
  TREASURY_WALLET_ID,
} from './shares';

// ── Test setup ──────────────────────────────────────────────────────────

// Set SHARE_IDENTITY_KEY for encryption tests (32 bytes = 64 hex chars)
process.env.SHARE_IDENTITY_KEY = 'a'.repeat(64);

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

/**
 * Seed the minimal data needed for share tests.
 * Creates fresh users, wallets, issues, and user_issues each time.
 */
async function seedShareTestData() {
  const db = getDb();

  // Clean share-specific tables
  await db.executeMultiple(`
    DELETE FROM share_status_history;
    DELETE FROM share_audit_log;
    DELETE FROM share_messages;
    DELETE FROM share_identities;
    DELETE FROM share_applications;
    DELETE FROM wallet_transactions;
    DELETE FROM wallets;
    DELETE FROM feed;
    DELETE FROM evidence;
    DELETE FROM issue_suggestions;
    DELETE FROM user_issues;
    DELETE FROM user_roles;
    DELETE FROM users;
    DELETE FROM issues;
    UPDATE share_certificate_counter SET next_number = 1 WHERE id = 1;
  `);

  // Issues (need 3+ for eligibility)
  for (let i = 1; i <= 4; i++) {
    await db.execute({
      sql: `INSERT INTO issues (id, name, category, description) VALUES (?, ?, 'Transport', ?)`,
      args: [`issue-${i}`, `Test Issue ${i}`, `Description ${i}`],
    });
  }

  // Users
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified, phone_verified)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['user-eligible', 'Eligible User', 'eligible@test.com', 1, 0],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified, phone_verified)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['user-unverified', 'Unverified User', 'unverified@test.com', 0, 0],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified, phone_verified)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['user-low', 'Low Activity User', 'low@test.com', 1, 0],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
    args: ['user-guide', 'Share Guide', 'guide@test.com', 1],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
    args: ['user-compliance', 'Compliance Guide', 'compliance@test.com', 1],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
    args: ['user-senior', 'Senior Compliance', 'senior@test.com', 1],
  });

  // Treasury system user + wallet
  await db.execute({
    sql: `INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, ?)`,
    args: [TREASURY_USER_ID, 'Treasury', 'treasury@system.quietriots.com', 'active'],
  });
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: [TREASURY_WALLET_ID, TREASURY_USER_ID, 0, 0, 0],
  });

  // User wallets
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['wallet-eligible', 'user-eligible', 500, 500, 0],
  });
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['wallet-low', 'user-low', 5, 5, 0], // Only 5p — insufficient
  });

  // Give user-eligible 3 riots + 10+ actions
  for (let i = 1; i <= 3; i++) {
    await db.execute({
      sql: `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`,
      args: [generateId(), 'user-eligible', `issue-${i}`],
    });
  }
  // Feed posts count as actions
  for (let i = 0; i < 8; i++) {
    await db.execute({
      sql: `INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)`,
      args: [generateId(), 'issue-1', 'user-eligible', `Post ${i}`],
    });
  }
  // issue_suggestions count too
  for (let i = 0; i < 2; i++) {
    await db.execute({
      sql: `INSERT INTO issue_suggestions (id, suggested_by, original_text, suggested_name, category, description)
            VALUES (?, ?, ?, ?, 'Transport', ?)`,
      args: [generateId(), 'user-eligible', `suggestion ${i}`, `Suggestion ${i}`, `Desc ${i}`],
    });
  }

  // Give user-low 1 riot + 2 actions (below threshold)
  await db.execute({
    sql: `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`,
    args: [generateId(), 'user-low', 'issue-1'],
  });
  await db.execute({
    sql: `INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)`,
    args: [generateId(), 'issue-1', 'user-low', 'Low activity post'],
  });
}

// ── Eligibility tests ───────────────────────────────────────────────────

describe('checkShareEligibility', () => {
  beforeEach(async () => {
    await seedShareTestData();
  });

  it('returns eligible for verified user with enough riots and actions', async () => {
    const result = await checkShareEligibility('user-eligible');
    expect(result.eligible).toBe(true);
    expect(result.riotsJoined).toBeGreaterThanOrEqual(RIOTS_REQUIRED);
    expect(result.actionsTaken).toBeGreaterThanOrEqual(ACTIONS_REQUIRED);
    expect(result.isVerified).toBe(true);
  });

  it('returns ineligible for unverified user', async () => {
    // Give unverified user enough riots and actions
    const db = getDb();
    for (let i = 1; i <= 3; i++) {
      await db.execute({
        sql: `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`,
        args: [generateId(), 'user-unverified', `issue-${i}`],
      });
    }
    for (let i = 0; i < 10; i++) {
      await db.execute({
        sql: `INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)`,
        args: [generateId(), 'issue-1', 'user-unverified', `Post ${i}`],
      });
    }
    const result = await checkShareEligibility('user-unverified');
    expect(result.eligible).toBe(false);
    expect(result.isVerified).toBe(false);
    expect(result.riotsJoined).toBeGreaterThanOrEqual(3);
  });

  it('returns ineligible for user below riot threshold', async () => {
    const result = await checkShareEligibility('user-low');
    expect(result.eligible).toBe(false);
    expect(result.riotsJoined).toBeLessThan(RIOTS_REQUIRED);
  });

  it('returns zero for nonexistent user', async () => {
    const result = await checkShareEligibility('nonexistent');
    expect(result.eligible).toBe(false);
    expect(result.riotsJoined).toBe(0);
    expect(result.actionsTaken).toBe(0);
  });
});

// ── Application lifecycle ───────────────────────────────────────────────

describe('getOrCreateShareApplication', () => {
  beforeEach(async () => {
    await seedShareTestData();
  });

  it('creates a new application with not_eligible status', async () => {
    const app = await getOrCreateShareApplication('user-eligible');
    expect(app.user_id).toBe('user-eligible');
    expect(app.status).toBe('not_eligible');
    expect(app.reapply_count).toBe(0);
  });

  it('returns existing application on second call', async () => {
    const first = await getOrCreateShareApplication('user-eligible');
    const second = await getOrCreateShareApplication('user-eligible');
    expect(first.id).toBe(second.id);
  });
});

describe('promoteToEligible', () => {
  beforeEach(async () => {
    await seedShareTestData();
  });

  it('promotes eligible user to available', async () => {
    await getOrCreateShareApplication('user-eligible');
    const promoted = await promoteToEligible('user-eligible');
    expect(promoted).toBe(true);

    const app = await getShareApplication('user-eligible');
    expect(app!.status).toBe('available');
    expect(app!.riots_joined_at_offer).toBeGreaterThanOrEqual(3);
    expect(app!.actions_at_offer).toBeGreaterThanOrEqual(10);
    expect(app!.eligible_at).toBeTruthy();
  });

  it('returns false for ineligible user', async () => {
    await getOrCreateShareApplication('user-low');
    const promoted = await promoteToEligible('user-low');
    expect(promoted).toBe(false);
  });

  it('returns false if already promoted (idempotent)', async () => {
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    const second = await promoteToEligible('user-eligible');
    expect(second).toBe(false);
  });

  it('records status history on promotion', async () => {
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    const app = await getShareApplication('user-eligible');
    const history = await getShareStatusHistory(app!.id);
    expect(history.length).toBe(1);
    expect(history[0].from_status).toBe('not_eligible');
    expect(history[0].to_status).toBe('available');
  });

  it('getOrCreateShareApplication returns stale status without promotion (regression)', async () => {
    // This documents the bug where the profile page showed "Not yet eligible"
    // even though the user was eligible — because it used the DB status
    // without calling promoteToEligible() first.
    const appBefore = await getOrCreateShareApplication('user-eligible');
    expect(appBefore.status).toBe('not_eligible');

    const eligibility = await checkShareEligibility('user-eligible');
    expect(eligibility.eligible).toBe(true);

    // After promotion, re-fetching shows the correct status
    await promoteToEligible('user-eligible');
    const appAfter = await getOrCreateShareApplication('user-eligible');
    expect(appAfter.status).toBe('available');
  });
});

// ── Payment flow ────────────────────────────────────────────────────────

describe('proceedWithShare', () => {
  beforeEach(async () => {
    await seedShareTestData();
    // Set up eligible + available state
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
  });

  it('deducts 10p and moves to under_review', async () => {
    const result = await proceedWithShare('user-eligible', 'wallet-eligible');
    expect(result.success).toBe(true);
    expect(result.application!.status).toBe('under_review');
    expect(result.application!.payment_amount_pence).toBe(SHARE_COST_PENCE);

    // Check wallet was debited
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500 - SHARE_COST_PENCE);

    // Check treasury was credited
    const treasury = await getTreasuryBalance();
    expect(treasury).toBe(SHARE_COST_PENCE);
  });

  it('fails with insufficient balance', async () => {
    // user-low has wallet with only 5p
    await getOrCreateShareApplication('user-low');
    // Manually set to available
    const db = getDb();
    await db.execute({
      sql: `UPDATE share_applications SET status = 'available' WHERE user_id = ?`,
      args: ['user-low'],
    });
    const result = await proceedWithShare('user-low', 'wallet-low');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
  });

  it('fails when not in available status', async () => {
    await proceedWithShare('user-eligible', 'wallet-eligible');
    // Now it's under_review — try again
    const result = await proceedWithShare('user-eligible', 'wallet-eligible');
    expect(result.success).toBe(false);
    expect(result.error).toContain('under_review');
  });

  it('fails with wrong wallet', async () => {
    const result = await proceedWithShare('user-eligible', 'nonexistent-wallet');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Wallet not found');
  });
});

// ── Decline flow ────────────────────────────────────────────────────────

describe('declineShare', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
  });

  it('moves to declined without payment', async () => {
    const declined = await declineShare('user-eligible');
    expect(declined).toBe(true);

    const app = await getShareApplication('user-eligible');
    expect(app!.status).toBe('declined');

    // Wallet unchanged
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500);
  });

  it('fails when not in available status', async () => {
    await declineShare('user-eligible');
    const second = await declineShare('user-eligible');
    expect(second).toBe(false);
  });
});

// ── Withdrawal flow ─────────────────────────────────────────────────────

describe('withdrawShare', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
  });

  it('withdraws from under_review and refunds 10p', async () => {
    const withdrawn = await withdrawShare('user-eligible');
    expect(withdrawn).toBe(true);

    const app = await getShareApplication('user-eligible');
    expect(app!.status).toBe('withdrawn');

    // 10p refunded to wallet
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500); // Back to original

    // Treasury debited
    const treasury = await getTreasuryBalance();
    expect(treasury).toBe(0);
  });

  it('fails when status is not under_review or approved', async () => {
    await withdrawShare('user-eligible');
    const second = await withdrawShare('user-eligible');
    expect(second).toBe(false);
  });
});

// ── Share Guide review ──────────────────────────────────────────────────

describe('approveShareApplication', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
  });

  it('moves from under_review to approved', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await approveShareApplication(app!.id, 'user-guide', 'Looks good');
    expect(result.success).toBe(true);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('approved');
    expect(updated!.share_guide_id).toBe('user-guide');
    expect(updated!.share_guide_notes).toBe('Looks good');
  });

  it('prevents self-review', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await approveShareApplication(app!.id, 'user-eligible');
    expect(result.success).toBe(false);
    expect(result.error).toContain('own application');
  });

  it('fails when not under_review', async () => {
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    const result = await approveShareApplication(app!.id, 'user-guide');
    expect(result.success).toBe(false);
    expect(result.error).toContain('approved');
  });
});

describe('rejectShareApplication', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
  });

  it('rejects and refunds 10p', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await rejectShareApplication(app!.id, 'user-guide', 'Insufficient evidence');
    expect(result.success).toBe(true);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('rejected');
    expect(updated!.rejection_reason).toBe('Insufficient evidence');

    // Wallet refunded
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500);
  });

  it('prevents self-review', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await rejectShareApplication(app!.id, 'user-eligible', 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('own application');
  });
});

// ── Identity submission ─────────────────────────────────────────────────

describe('submitIdentity', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
  });

  it('submits identity and moves to identity_submitted', async () => {
    const result = await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
      idDocumentType: 'passport',
      idDocumentCountry: 'GB',
    });
    expect(result.success).toBe(true);

    const app = await getShareApplication('user-eligible');
    expect(app!.status).toBe('identity_submitted');
  });

  it('encrypts PII fields', async () => {
    await submitIdentity('user-eligible', {
      legalFirstName: 'Secret',
      legalLastName: 'Name',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Hidden Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });

    // Read raw from DB — should be encrypted (contains colons from iv:authTag:ciphertext)
    const db = getDb();
    const raw = await db.execute({
      sql: 'SELECT legal_first_name FROM share_identities WHERE user_id = ?',
      args: ['user-eligible'],
    });
    const rawValue = raw.rows[0]!.legal_first_name as string;
    expect(rawValue).toContain(':'); // Encrypted format: iv:authTag:ciphertext
    expect(rawValue).not.toBe('Secret');
  });

  it('decrypts PII when accessed with audit logging', async () => {
    await submitIdentity('user-eligible', {
      legalFirstName: 'Decrypted',
      legalLastName: 'Name',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });

    const app = await getShareApplication('user-eligible');
    const identity = await getShareIdentity(app!.id, 'user-compliance');
    expect(identity!.legal_first_name).toBe('Decrypted');
    expect(identity!.legal_last_name).toBe('Name');

    // Check audit log recorded PII access
    const audit = await getShareAuditLog(app!.id);
    const accessLog = audit.find((a) => a.action === 'viewed_identity');
    expect(accessLog).toBeTruthy();
    expect(accessLog!.actor_id).toBe('user-compliance');
  });

  it('fails when not in approved status', async () => {
    // First submission succeeds
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
    // Second fails — already identity_submitted
    const result = await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('identity_submitted');
  });
});

// ── Compliance review ───────────────────────────────────────────────────

describe('approveCompliance', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
  });

  it('issues certificate and moves to issued', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await approveCompliance(app!.id, 'user-compliance', 'All verified');
    expect(result.success).toBe(true);
    expect(result.certificateNumber).toMatch(/^QR-\d{6}-\d{5}$/);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('issued');
    expect(updated!.certificate_number).toBe(result.certificateNumber);
    expect(updated!.issued_at).toBeTruthy();
  });

  it('generates sequential certificate numbers', async () => {
    const app = await getShareApplication('user-eligible');
    const r1 = await approveCompliance(app!.id, 'user-compliance');

    // Create another user's application all the way through
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
      args: ['user-eligible-2', 'User 2', 'user2@test.com', 1],
    });
    await db.execute({
      sql: `INSERT INTO wallets (id, user_id, balance_pence) VALUES (?, ?, ?)`,
      args: ['wallet-eligible-2', 'user-eligible-2', 500],
    });
    for (let i = 1; i <= 3; i++) {
      await db.execute({
        sql: `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`,
        args: [generateId(), 'user-eligible-2', `issue-${i}`],
      });
    }
    for (let i = 0; i < 10; i++) {
      await db.execute({
        sql: `INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)`,
        args: [generateId(), 'issue-1', 'user-eligible-2', `Post ${i}`],
      });
    }
    await getOrCreateShareApplication('user-eligible-2');
    await promoteToEligible('user-eligible-2');
    await proceedWithShare('user-eligible-2', 'wallet-eligible-2');
    const app2 = await getShareApplication('user-eligible-2');
    await approveShareApplication(app2!.id, 'user-guide');
    await submitIdentity('user-eligible-2', {
      legalFirstName: 'Jane',
      legalLastName: 'Smith',
      dateOfBirth: '1985-06-20',
      addressLine1: '456 Other Road',
      city: 'Manchester',
      countryCode: 'GB',
      phone: '+447700900002',
    });
    const r2 = await approveCompliance(app2!.id, 'user-compliance');

    // Second certificate number should be sequential
    expect(r1.certificateNumber).toBeTruthy();
    expect(r2.certificateNumber).toBeTruthy();
    // Extract sequence numbers
    const seq1 = parseInt(r1.certificateNumber!.split('-')[2]);
    const seq2 = parseInt(r2.certificateNumber!.split('-')[2]);
    expect(seq2).toBe(seq1 + 1);
  });

  it('prevents self-review', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await approveCompliance(app!.id, 'user-eligible');
    expect(result.success).toBe(false);
    expect(result.error).toContain('own application');
  });
});

describe('rejectCompliance', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
  });

  it('rejects and refunds', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await rejectCompliance(app!.id, 'user-compliance', 'ID document mismatch');
    expect(result.success).toBe(true);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('rejected');

    // Wallet refunded
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500);
  });
});

describe('forwardToSenior', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
  });

  it('forwards to senior compliance', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await forwardToSenior(app!.id, 'user-compliance', 'Need senior review');
    expect(result.success).toBe(true);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('forwarded_senior');
    expect(updated!.compliance_guide_id).toBe('user-compliance');
  });

  it('prevents self-review', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await forwardToSenior(app!.id, 'user-eligible', 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('own application');
  });
});

// ── Senior Compliance ───────────────────────────────────────────────────

describe('approveSenior', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
    await forwardToSenior(app!.id, 'user-compliance', 'Needs senior review');
  });

  it('issues certificate from forwarded_senior', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await approveSenior(app!.id, 'user-senior', 'Approved at senior level');
    expect(result.success).toBe(true);
    expect(result.certificateNumber).toMatch(/^QR-\d{6}-\d{5}$/);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('issued');
    expect(updated!.senior_compliance_id).toBe('user-senior');
  });
});

describe('rejectSenior', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await approveShareApplication(app!.id, 'user-guide');
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
    await forwardToSenior(app!.id, 'user-compliance', 'Needs senior review');
  });

  it('rejects from forwarded_senior and refunds', async () => {
    const app = await getShareApplication('user-eligible');
    const result = await rejectSenior(app!.id, 'user-senior', 'Failed senior review');
    expect(result.success).toBe(true);

    const updated = await getShareApplicationById(app!.id);
    expect(updated!.status).toBe('rejected');

    // Refunded
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(500);
  });
});

// ── Reapply flow ────────────────────────────────────────────────────────

describe('reapplyForShare', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const app = await getShareApplication('user-eligible');
    await rejectShareApplication(app!.id, 'user-guide', 'First attempt rejected');
  });

  it('reapplies with fresh 10p payment', async () => {
    const result = await reapplyForShare('user-eligible', 'wallet-eligible');
    expect(result.success).toBe(true);
    expect(result.application!.status).toBe('under_review');
    expect(result.application!.reapply_count).toBe(1);

    // Second 10p deducted (first was refunded in rejection)
    const db = getDb();
    const wallet = await db.execute({
      sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
      args: ['wallet-eligible'],
    });
    expect(Number(wallet.rows[0]!.balance_pence)).toBe(490); // 500 - 10 (refunded) - 10 (reapply)
  });

  it('clears previous review data on reapply', async () => {
    const result = await reapplyForShare('user-eligible', 'wallet-eligible');
    expect(result.application!.share_guide_id).toBeNull();
    expect(result.application!.share_guide_notes).toBeNull();
    expect(result.application!.rejection_reason).toBeNull();
  });

  it('fails when not in rejected status', async () => {
    await reapplyForShare('user-eligible', 'wallet-eligible');
    // Now under_review — can't reapply again
    const result = await reapplyForShare('user-eligible', 'wallet-eligible');
    expect(result.success).toBe(false);
    expect(result.error).toContain('under_review');
  });
});

// ── Messages ────────────────────────────────────────────────────────────

describe('share messages', () => {
  beforeEach(async () => {
    await seedShareTestData();
    await getOrCreateShareApplication('user-eligible');
    await promoteToEligible('user-eligible');
    await proceedWithShare('user-eligible', 'wallet-eligible');
  });

  it('creates and retrieves messages', async () => {
    const app = await getShareApplication('user-eligible');
    const msg = await createShareMessage(app!.id, 'user-eligible', 'applicant', 'Hello!');
    expect(msg.content).toBe('Hello!');
    expect(msg.sender_role).toBe('applicant');

    const messages = await getShareMessages(app!.id, 'applicant');
    expect(messages.length).toBe(1);
  });

  it('filters messages by role visibility', async () => {
    const app = await getShareApplication('user-eligible');

    // Create messages from different roles
    await createShareMessage(app!.id, 'user-eligible', 'applicant', 'User question');
    await createShareMessage(app!.id, 'user-guide', 'share_guide', 'Guide reply');
    await createShareMessage(app!.id, 'user-compliance', 'compliance_guide', 'Compliance note');
    await createShareMessage(app!.id, 'user-senior', 'senior_compliance', 'Senior note');

    // Applicant sees own + share_guide only
    const applicantView = await getShareMessages(app!.id, 'applicant');
    expect(applicantView.length).toBe(2);

    // Share guide sees applicant + self
    const guideView = await getShareMessages(app!.id, 'share_guide');
    expect(guideView.length).toBe(2);

    // Compliance sees applicant + share_guide + self
    const complianceView = await getShareMessages(app!.id, 'compliance_guide');
    expect(complianceView.length).toBe(3);

    // Senior sees all
    const seniorView = await getShareMessages(app!.id, 'senior_compliance');
    expect(seniorView.length).toBe(4);
  });
});

// ── Stats ───────────────────────────────────────────────────────────────

describe('getShareStats', () => {
  beforeEach(async () => {
    await seedShareTestData();
  });

  it('counts applications by status', async () => {
    await getOrCreateShareApplication('user-eligible');
    await getOrCreateShareApplication('user-low');
    await promoteToEligible('user-eligible');

    const stats = await getShareStats();
    expect(stats.total).toBe(2);
    expect(stats.byStatus['not_eligible']).toBe(1); // user-low
    expect(stats.byStatus['available']).toBe(1); // user-eligible
  });
});

// ── ID Verification tiers ───────────────────────────────────────────────

describe('getIdVerificationTier', () => {
  it('returns digital for UK', () => {
    expect(getIdVerificationTier('GB')).toBe('digital');
  });

  it('returns digital for US', () => {
    expect(getIdVerificationTier('US')).toBe('digital');
  });

  it('returns limited for China', () => {
    expect(getIdVerificationTier('CN')).toBe('limited');
  });

  it('returns unavailable for unknown country', () => {
    expect(getIdVerificationTier('XX')).toBe('unavailable');
  });
});

// ── Full lifecycle test ─────────────────────────────────────────────────

describe('full share lifecycle', () => {
  beforeEach(async () => {
    await seedShareTestData();
  });

  it('completes entire flow: not_eligible → available → under_review → approved → identity_submitted → issued', async () => {
    // 1. Create application
    const app = await getOrCreateShareApplication('user-eligible');
    expect(app.status).toBe('not_eligible');

    // 2. Promote when eligible
    await promoteToEligible('user-eligible');
    const promoted = await getShareApplication('user-eligible');
    expect(promoted!.status).toBe('available');

    // 3. Pay 10p
    await proceedWithShare('user-eligible', 'wallet-eligible');
    const paid = await getShareApplication('user-eligible');
    expect(paid!.status).toBe('under_review');

    // 4. Share Guide approves
    await approveShareApplication(paid!.id, 'user-guide', 'Verified');
    const approved = await getShareApplication('user-eligible');
    expect(approved!.status).toBe('approved');

    // 5. Submit identity
    await submitIdentity('user-eligible', {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      addressLine1: '123 Test Street',
      city: 'London',
      countryCode: 'GB',
      phone: '+447700900001',
    });
    const submitted = await getShareApplication('user-eligible');
    expect(submitted!.status).toBe('identity_submitted');

    // 6. Compliance approves → issued
    const result = await approveCompliance(submitted!.id, 'user-compliance', 'All good');
    expect(result.success).toBe(true);
    expect(result.certificateNumber).toMatch(/^QR-\d{6}-\d{5}$/);

    const final = await getShareApplication('user-eligible');
    expect(final!.status).toBe('issued');
    expect(final!.certificate_number).toBe(result.certificateNumber);

    // 7. Verify history has all transitions
    const history = await getShareStatusHistory(final!.id);
    expect(history.length).toBe(5); // not_eligible→available→under_review→approved→identity_submitted→issued
    expect(history[0].from_status).toBe('not_eligible');
    expect(history[0].to_status).toBe('available');
    expect(history[4].from_status).toBe('identity_submitted');
    expect(history[4].to_status).toBe('issued');

    // 8. Treasury has 10p
    const treasury = await getTreasuryBalance();
    expect(treasury).toBe(10);
  });
});
