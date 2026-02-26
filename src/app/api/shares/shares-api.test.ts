import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';

// Set encryption key for identity tests
process.env.SHARE_IDENTITY_KEY = 'a'.repeat(64);
process.env.SHARE_ACCESS_PASSWORD = 'reallyglobal';

// Mock next/headers before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET as getShare } from './route';
import { POST as proceedShare } from './proceed/route';
import { POST as declineShare } from './decline/route';
import { POST as withdrawShare } from './withdraw/route';
// Identity + reapply routes tested indirectly via query-layer tests
import { POST as accessShare } from './access/route';
import { POST as reviewShare } from './[id]/review/route';
import { POST as complianceShare } from './[id]/compliance/route';
// Senior route tested indirectly via query-layer tests
import { GET as getQueue } from './queue/route';
import { GET as getTreasury } from './treasury/route';
import {
  GET as getTeam,
  POST as assignTeamRole,
  DELETE as removeTeamRole,
} from '../roles/team/route';
import { TREASURY_USER_ID, TREASURY_WALLET_ID } from '@/lib/queries/shares';

beforeAll(async () => {
  await setupTestDb();
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

function jsonRequest(url: string, body?: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function seedShareApiTestData() {
  const db = getDb();

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

  // Issues
  for (let i = 1; i <= 4; i++) {
    await db.execute({
      sql: `INSERT INTO issues (id, name, category, description) VALUES (?, ?, 'Transport', ?)`,
      args: [`issue-${i}`, `Test Issue ${i}`, `Description ${i}`],
    });
  }

  // Users
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
    args: ['user-eligible', 'Eligible User', 'eligible@test.com', 1],
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
    args: ['user-admin', 'Admin User', 'admin@test.com', 1],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)`,
    args: ['user-norole', 'No Role User', 'norole@test.com', 1],
  });

  // Treasury
  await db.execute({
    sql: `INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, ?)`,
    args: [TREASURY_USER_ID, 'Treasury', 'treasury@system.quietriots.com', 'active'],
  });
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: [TREASURY_WALLET_ID, TREASURY_USER_ID, 0, 0, 0],
  });

  // Wallets
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['wallet-eligible', 'user-eligible', 500, 500, 0],
  });

  // Roles
  await db.execute({
    sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
    args: [generateId(), 'user-guide', 'share_guide'],
  });
  await db.execute({
    sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
    args: [generateId(), 'user-compliance', 'compliance_guide'],
  });
  await db.execute({
    sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
    args: [generateId(), 'user-admin', 'administrator'],
  });

  // Eligibility: 3 riots + 10+ actions
  for (let i = 1; i <= 3; i++) {
    await db.execute({
      sql: `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`,
      args: [generateId(), 'user-eligible', `issue-${i}`],
    });
  }
  for (let i = 0; i < 8; i++) {
    await db.execute({
      sql: `INSERT INTO feed (id, issue_id, user_id, content) VALUES (?, ?, ?, ?)`,
      args: [generateId(), 'issue-1', 'user-eligible', `Post ${i}`],
    });
  }
  for (let i = 0; i < 2; i++) {
    await db.execute({
      sql: `INSERT INTO issue_suggestions (id, suggested_by, original_text, suggested_name, category, description)
            VALUES (?, ?, ?, ?, 'Transport', ?)`,
      args: [generateId(), 'user-eligible', `sug ${i}`, `Suggestion ${i}`, `Desc ${i}`],
    });
  }
}

// ── GET /api/shares ─────────────────────────────────────────────────────

describe('GET /api/shares', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('returns 401 for unauthenticated users', async () => {
    mockLoggedOut();
    const response = await getShare();
    expect(response.status).toBe(401);
  });

  it('auto-promotes eligible user to available status', async () => {
    mockLoggedIn('user-eligible');
    const response = await getShare();
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    // User meets all criteria — should auto-promote from not_eligible to available
    expect(data.application.status).toBe('available');
    expect(data.eligibility.eligible).toBe(true);
    expect(data.eligibility.riotsJoined).toBeGreaterThanOrEqual(3);
    expect(data.paymentRequired).toBe(10);
  });

  it('does not promote ineligible user', async () => {
    // user-norole has no riots joined and no actions
    mockLoggedIn('user-norole');
    const response = await getShare();
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.application.status).toBe('not_eligible');
    expect(data.eligibility.eligible).toBe(false);
  });

  it('does not expose guide IDs in response', async () => {
    mockLoggedIn('user-eligible');
    const response = await getShare();
    const { data } = await response.json();
    expect(data.application).not.toHaveProperty('share_guide_id');
    expect(data.application).not.toHaveProperty('share_guide_notes');
    expect(data.application).not.toHaveProperty('compliance_guide_id');
  });
});

// ── POST /api/shares/proceed ────────────────────────────────────────────

describe('POST /api/shares/proceed', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
    // Promote to available
    const db = getDb();
    const id = generateId();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES (?, ?, 'available')`,
      args: [id, 'user-eligible'],
    });
  });

  it('returns 401 for unauthenticated', async () => {
    mockLoggedOut();
    const response = await proceedShare();
    expect(response.status).toBe(401);
  });

  it('succeeds with 10p payment', async () => {
    mockLoggedIn('user-eligible');
    const response = await proceedShare();
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.application.status).toBe('under_review');
    expect(data.application.payment_amount_pence).toBe(10);
  });
});

// ── POST /api/shares/decline ────────────────────────────────────────────

describe('POST /api/shares/decline', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES (?, ?, 'available')`,
      args: [generateId(), 'user-eligible'],
    });
  });

  it('declines the share', async () => {
    mockLoggedIn('user-eligible');
    const response = await declineShare();
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.declined).toBe(true);
  });
});

// ── POST /api/shares/withdraw ───────────────────────────────────────────

describe('POST /api/shares/withdraw', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
    const db = getDb();
    // Give treasury 10p (as if the user had already paid)
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 10 WHERE id = ?`,
      args: [TREASURY_WALLET_ID],
    });
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status, payment_transaction_id, payment_amount_pence) VALUES (?, ?, 'under_review', ?, ?)`,
      args: [generateId(), 'user-eligible', 'tx-test', 10],
    });
  });

  it('withdraws and refunds', async () => {
    mockLoggedIn('user-eligible');
    const response = await withdrawShare();
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.withdrawn).toBe(true);
  });
});

// ── POST /api/shares/access ────────────────────────────────────────────

describe('POST /api/shares/access', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('grants access with correct password', async () => {
    mockLoggedIn('user-eligible');
    const request = jsonRequest('http://localhost:3000/api/shares/access', {
      password: 'reallyglobal',
    });
    const response = await accessShare(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.granted).toBe(true);
  });

  it('rejects incorrect password', async () => {
    mockLoggedIn('user-eligible');
    const request = jsonRequest('http://localhost:3000/api/shares/access', {
      password: 'wrongpassword',
    });
    const response = await accessShare(request);
    expect(response.status).toBe(403);
  });

  it('returns 401 for unauthenticated', async () => {
    mockLoggedOut();
    const request = jsonRequest('http://localhost:3000/api/shares/access', {
      password: 'reallyglobal',
    });
    const response = await accessShare(request);
    expect(response.status).toBe(401);
  });
});

// ── POST /api/shares/[id]/review ────────────────────────────────────────

describe('POST /api/shares/[id]/review', () => {
  let appId: string;

  beforeEach(async () => {
    await seedShareApiTestData();
    appId = generateId();
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES (?, ?, 'under_review')`,
      args: [appId, 'user-eligible'],
    });
  });

  it('returns 403 for non-guide user', async () => {
    mockLoggedIn('user-norole');
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/review', {
      decision: 'approve',
    });
    const response = await reviewShare(request, { params: Promise.resolve({ id: appId }) });
    expect(response.status).toBe(403);
  });

  it('approves application as share guide', async () => {
    mockLoggedIn('user-guide');
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/review', {
      decision: 'approve',
      notes: 'Looks good',
    });
    const response = await reviewShare(request, { params: Promise.resolve({ id: appId }) });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.approved).toBe(true);
  });

  it('rejects application with reason', async () => {
    mockLoggedIn('user-guide');
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/review', {
      decision: 'reject',
      reason: 'Insufficient info',
    });
    const response = await reviewShare(request, { params: Promise.resolve({ id: appId }) });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.rejected).toBe(true);
  });

  it('prevents self-review', async () => {
    mockLoggedIn('user-eligible');
    // Give user-eligible the share_guide role
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
      args: [generateId(), 'user-eligible', 'share_guide'],
    });
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/review', {
      decision: 'approve',
    });
    const response = await reviewShare(request, { params: Promise.resolve({ id: appId }) });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error).toContain('own application');
  });
});

// ── POST /api/shares/[id]/compliance ────────────────────────────────────

describe('POST /api/shares/[id]/compliance', () => {
  let appId: string;

  beforeEach(async () => {
    await seedShareApiTestData();
    appId = generateId();
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status, payment_transaction_id, payment_amount_pence) VALUES (?, ?, 'identity_submitted', ?, ?)`,
      args: [appId, 'user-eligible', 'tx-test', 10],
    });
    await db.execute({
      sql: `INSERT INTO share_identities (id, application_id, user_id, legal_first_name, legal_last_name, date_of_birth, address_line_1, city, country_code, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        generateId(),
        appId,
        'user-eligible',
        'John',
        'Doe',
        '1990-01-01',
        '123 Street',
        'London',
        'GB',
        '+44700900001',
      ],
    });
  });

  it('approves and issues certificate', async () => {
    mockLoggedIn('user-compliance');
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/compliance', {
      decision: 'approve',
      notes: 'All verified',
    });
    const response = await complianceShare(request, { params: Promise.resolve({ id: appId }) });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.approved).toBe(true);
    expect(data.certificateNumber).toMatch(/^QR-\d{6}-\d{5}$/);
  });

  it('forwards to senior compliance', async () => {
    mockLoggedIn('user-compliance');
    const request = jsonRequest('http://localhost:3000/api/shares/' + appId + '/compliance', {
      decision: 'forward_senior',
      notes: 'Needs further review',
    });
    const response = await complianceShare(request, { params: Promise.resolve({ id: appId }) });
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.forwarded).toBe(true);
  });
});

// ── GET /api/shares/queue ───────────────────────────────────────────────

describe('GET /api/shares/queue', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES (?, ?, 'under_review')`,
      args: [generateId(), 'user-eligible'],
    });
  });

  it('returns 403 for non-guide user', async () => {
    mockLoggedIn('user-norole');
    const request = new NextRequest('http://localhost:3000/api/shares/queue');
    const response = await getQueue(request);
    expect(response.status).toBe(403);
  });

  it('returns queue for share guide', async () => {
    mockLoggedIn('user-guide');
    const request = new NextRequest('http://localhost:3000/api/shares/queue');
    const response = await getQueue(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.applications.length).toBeGreaterThanOrEqual(1);
  });

  it('returns queue for admin', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/shares/queue');
    const response = await getQueue(request);
    expect(response.status).toBe(200);
  });
});

// ── GET /api/shares/treasury ────────────────────────────────────────────

describe('GET /api/shares/treasury', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('returns 403 for non-treasury user', async () => {
    mockLoggedIn('user-norole');
    const request = new NextRequest('http://localhost:3000/api/shares/treasury');
    const response = await getTreasury(request);
    expect(response.status).toBe(403);
  });

  it('returns treasury data for admin', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/shares/treasury');
    const response = await getTreasury(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.balance).toBe(0);
    expect(data.stats).toBeDefined();
  });
});

// ── Team roles API ──────────────────────────────────────────────────────

describe('GET /api/roles/team', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('returns 403 for non-admin', async () => {
    mockLoggedIn('user-guide');
    const request = new NextRequest('http://localhost:3000/api/roles/team');
    const response = await getTeam(request);
    expect(response.status).toBe(403);
  });

  it('returns all roles for admin', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/roles/team');
    const response = await getTeam(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.roles.length).toBeGreaterThanOrEqual(3); // guide, compliance, admin
  });
});

describe('POST /api/roles/team', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('assigns a role', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/roles/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-norole', role: 'treasury_guide' }),
    });
    const response = await assignTeamRole(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(201);
    expect(ok).toBe(true);
    expect(data.role.role).toBe('treasury_guide');
  });

  it('enforces mutual exclusivity between share_guide and compliance_guide', async () => {
    mockLoggedIn('user-admin');
    // user-guide already has share_guide — try to add compliance_guide
    const request = new NextRequest('http://localhost:3000/api/roles/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-guide', role: 'compliance_guide' }),
    });
    const response = await assignTeamRole(request);
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error).toContain('share_guide');
  });
});

describe('DELETE /api/roles/team', () => {
  beforeEach(async () => {
    await seedShareApiTestData();
  });

  it('removes a role', async () => {
    mockLoggedIn('user-admin');
    const request = new NextRequest('http://localhost:3000/api/roles/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-guide', role: 'share_guide' }),
    });
    const response = await removeTeamRole(request);
    const { ok, data } = await response.json();
    expect(response.status).toBe(200);
    expect(ok).toBe(true);
    expect(data.removed).toBe(true);
  });
});
