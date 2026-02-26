import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';
import { sanitizeText } from '@/lib/sanitize';
import { encryptIdentityFields, decryptIdentityFields } from '@/lib/share-crypto';
import type {
  ShareApplication,
  ShareIdentity,
  ShareMessage,
  ShareAuditEntry,
  ShareStatusHistory,
  ShareStatus,
  ShareSenderRole,
  ShareGender,
  IdDocumentType,
  WalletTransaction,
} from '@/types';

// ── Constants ───────────────────────────────────────────────────────────

export const SHARE_COST_PENCE = 10;
export const RIOTS_REQUIRED = 3;
export const ACTIONS_REQUIRED = 10;
export const TREASURY_USER_ID = 'treasury';
export const TREASURY_WALLET_ID = 'treasury-wallet';

// ── Eligibility ─────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  riotsJoined: number;
  actionsTaken: number;
  isVerified: boolean;
  riotsRequired: number;
  actionsRequired: number;
}

/**
 * Check if a user meets the share eligibility criteria:
 * 1. Verified real-name user (email or phone verified)
 * 2. Joined >= 3 Quiet Riots
 * 3. Completed >= 10 actions (feed posts + evidence + user_issues joins + suggestions)
 */
export async function checkShareEligibility(userId: string): Promise<EligibilityResult> {
  const db = getDb();

  // Single query with subqueries for efficiency
  const result = await db.execute({
    sql: `SELECT
      (SELECT COUNT(*) FROM user_issues WHERE user_id = ?) as riots_joined,
      (SELECT COUNT(*) FROM feed WHERE user_id = ?) +
      (SELECT COUNT(*) FROM evidence WHERE user_id = ?) +
      (SELECT COUNT(*) FROM user_issues WHERE user_id = ?) +
      (SELECT COUNT(*) FROM issue_suggestions WHERE suggested_by = ?) as actions_taken,
      u.email_verified, u.phone_verified, u.name
    FROM users u WHERE u.id = ?`,
    args: [userId, userId, userId, userId, userId, userId],
  });

  const row = result.rows[0];
  if (!row) {
    return {
      eligible: false,
      riotsJoined: 0,
      actionsTaken: 0,
      isVerified: false,
      riotsRequired: RIOTS_REQUIRED,
      actionsRequired: ACTIONS_REQUIRED,
    };
  }

  const riotsJoined = Number(row.riots_joined) || 0;
  const actionsTaken = Number(row.actions_taken) || 0;
  const isVerified = Number(row.email_verified) === 1 || Number(row.phone_verified) === 1;

  return {
    eligible: isVerified && riotsJoined >= RIOTS_REQUIRED && actionsTaken >= ACTIONS_REQUIRED,
    riotsJoined,
    actionsTaken,
    isVerified,
    riotsRequired: RIOTS_REQUIRED,
    actionsRequired: ACTIONS_REQUIRED,
  };
}

// ── Application CRUD ────────────────────────────────────────────────────

/**
 * Get or create a share application for a user.
 * Lazy-creates with `not_eligible` status if none exists.
 */
export async function getOrCreateShareApplication(userId: string): Promise<ShareApplication> {
  const db = getDb();

  // Try existing first
  const existing = await db.execute({
    sql: 'SELECT * FROM share_applications WHERE user_id = ?',
    args: [userId],
  });
  if (existing.rows[0]) {
    return existing.rows[0] as unknown as ShareApplication;
  }

  // Create new
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO share_applications (id, user_id, status) VALUES (?, ?, 'not_eligible')`,
    args: [id, userId],
  });

  const result = await db.execute({
    sql: 'SELECT * FROM share_applications WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as ShareApplication;
}

export async function getShareApplication(userId: string): Promise<ShareApplication | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM share_applications WHERE user_id = ?',
    args: [userId],
  });
  return (result.rows[0] as unknown as ShareApplication) ?? null;
}

export async function getShareApplicationById(id: string): Promise<ShareApplication | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM share_applications WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as ShareApplication) ?? null;
}

// ── Eligibility promotion (async, fire-and-forget) ──────────────────────

/**
 * Promote a user from `not_eligible` to `available` if they meet criteria.
 * Uses `WHERE status = 'not_eligible'` + `rowsAffected` guard to prevent
 * duplicate notifications.
 * Returns true if promoted, false if already promoted or not eligible.
 */
export async function promoteToEligible(userId: string): Promise<boolean> {
  const eligibility = await checkShareEligibility(userId);
  if (!eligibility.eligible) return false;

  const app = await getOrCreateShareApplication(userId);
  if (app.status !== 'not_eligible') return false;

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'available',
              riots_joined_at_offer = ?,
              actions_at_offer = ?,
              eligible_at = datetime('now'),
              updated_at = datetime('now')
          WHERE user_id = ? AND status = 'not_eligible'`,
    args: [eligibility.riotsJoined, eligibility.actionsTaken, userId],
  });

  if (result.rowsAffected === 0) return false;

  await recordStatusHistory(
    app.id,
    'not_eligible',
    'available',
    userId,
    'Auto-promoted on eligibility',
  );
  return true;
}

// ── Core lifecycle transitions ──────────────────────────────────────────

/**
 * User proceeds with share application — pays 10p from wallet.
 * Atomic: debit wallet + credit treasury + create transaction + update status.
 * available → under_review
 */
export async function proceedWithShare(
  userId: string,
  walletId: string,
): Promise<{ success: boolean; error?: string; application?: ShareApplication }> {
  const db = getDb();

  // Verify application is in correct state
  const app = await getShareApplication(userId);
  if (!app) return { success: false, error: 'No share application found' };
  if (app.status !== 'available') {
    return { success: false, error: `Cannot proceed — current status is ${app.status}` };
  }

  // Check wallet balance
  const walletResult = await db.execute({
    sql: 'SELECT * FROM wallets WHERE id = ? AND user_id = ?',
    args: [walletId, userId],
  });
  const wallet = walletResult.rows[0];
  if (!wallet) return { success: false, error: 'Wallet not found' };
  if (Number(wallet.balance_pence) < SHARE_COST_PENCE) {
    return { success: false, error: 'Insufficient wallet balance' };
  }

  const txId = generateId();

  // Atomic batch: debit user wallet + credit treasury + create transaction + update status
  await db.batch([
    // Debit user wallet
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence - ?, total_spent_pence = total_spent_pence + ?, updated_at = datetime('now')
            WHERE id = ? AND balance_pence >= ?`,
      args: [SHARE_COST_PENCE, SHARE_COST_PENCE, walletId, SHARE_COST_PENCE],
    },
    // Credit treasury wallet
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence + ?, total_loaded_pence = total_loaded_pence + ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [SHARE_COST_PENCE, SHARE_COST_PENCE, TREASURY_WALLET_ID],
    },
    // Record transaction
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description, completed_at)
            VALUES (?, ?, 'share_consideration', ?, 'Share consideration payment (10p)', datetime('now'))`,
      args: [txId, walletId, SHARE_COST_PENCE],
    },
    // Update application status
    {
      sql: `UPDATE share_applications
            SET status = 'under_review',
                payment_transaction_id = ?,
                payment_amount_pence = ?,
                updated_at = datetime('now')
            WHERE user_id = ? AND status = 'available'`,
      args: [txId, SHARE_COST_PENCE, userId],
    },
  ]);

  // Verify the status actually changed (race condition guard)
  const updated = await getShareApplication(userId);
  if (!updated || updated.status !== 'under_review') {
    return { success: false, error: 'Status transition failed — possible race condition' };
  }

  await recordStatusHistory(
    updated.id,
    'available',
    'under_review',
    userId,
    'Paid 10p consideration',
  );
  await logShareAudit(
    updated.id,
    userId,
    'proceeded',
    `Paid ${SHARE_COST_PENCE}p via wallet ${walletId}`,
  );

  return { success: true, application: updated };
}

/**
 * User declines the share offer. Permanent — no payment taken.
 * available → declined
 */
export async function declineShare(userId: string): Promise<boolean> {
  const db = getDb();
  const app = await getShareApplication(userId);
  if (!app || app.status !== 'available') return false;

  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'declined', updated_at = datetime('now')
          WHERE user_id = ? AND status = 'available'`,
    args: [userId],
  });

  if (result.rowsAffected === 0) return false;

  await recordStatusHistory(app.id, 'available', 'declined', userId, 'User declined share offer');
  await logShareAudit(app.id, userId, 'declined', 'User permanently declined');
  return true;
}

/**
 * User withdraws their application. 10p refunded.
 * under_review | approved → withdrawn
 */
export async function withdrawShare(userId: string): Promise<boolean> {
  const db = getDb();
  const app = await getShareApplication(userId);
  if (!app || !['under_review', 'approved'].includes(app.status)) return false;

  const oldStatus = app.status;

  // Refund the 10p if payment was made
  if (app.payment_transaction_id) {
    await refundSharePayment(app, userId);
  }

  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'withdrawn', updated_at = datetime('now')
          WHERE user_id = ? AND status IN ('under_review', 'approved')`,
    args: [userId],
  });

  if (result.rowsAffected === 0) return false;

  await recordStatusHistory(app.id, oldStatus, 'withdrawn', userId, 'User withdrew application');
  await logShareAudit(app.id, userId, 'withdrawn', `Withdrawn from ${oldStatus}`);
  return true;
}

/**
 * User reapplies after rejection. Requires another 10p payment.
 * rejected → under_review
 */
export async function reapplyForShare(
  userId: string,
  walletId: string,
): Promise<{ success: boolean; error?: string; application?: ShareApplication }> {
  const db = getDb();

  const app = await getShareApplication(userId);
  if (!app) return { success: false, error: 'No share application found' };
  if (app.status !== 'rejected') {
    return { success: false, error: `Cannot reapply — current status is ${app.status}` };
  }

  // Check wallet balance
  const walletResult = await db.execute({
    sql: 'SELECT * FROM wallets WHERE id = ? AND user_id = ?',
    args: [walletId, userId],
  });
  const wallet = walletResult.rows[0];
  if (!wallet) return { success: false, error: 'Wallet not found' };
  if (Number(wallet.balance_pence) < SHARE_COST_PENCE) {
    return { success: false, error: 'Insufficient wallet balance' };
  }

  const txId = generateId();

  await db.batch([
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence - ?, total_spent_pence = total_spent_pence + ?, updated_at = datetime('now')
            WHERE id = ? AND balance_pence >= ?`,
      args: [SHARE_COST_PENCE, SHARE_COST_PENCE, walletId, SHARE_COST_PENCE],
    },
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence + ?, total_loaded_pence = total_loaded_pence + ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [SHARE_COST_PENCE, SHARE_COST_PENCE, TREASURY_WALLET_ID],
    },
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description, completed_at)
            VALUES (?, ?, 'share_consideration', ?, 'Share consideration payment (reapply)', datetime('now'))`,
      args: [txId, walletId, SHARE_COST_PENCE],
    },
    {
      sql: `UPDATE share_applications
            SET status = 'under_review',
                payment_transaction_id = ?,
                payment_amount_pence = ?,
                reapply_count = reapply_count + 1,
                rejection_reason = NULL,
                share_guide_id = NULL,
                share_guide_decision_at = NULL,
                share_guide_notes = NULL,
                compliance_guide_id = NULL,
                compliance_decision_at = NULL,
                compliance_notes = NULL,
                senior_compliance_id = NULL,
                senior_decision_at = NULL,
                senior_notes = NULL,
                updated_at = datetime('now')
            WHERE user_id = ? AND status = 'rejected'`,
      args: [txId, SHARE_COST_PENCE, userId],
    },
  ]);

  const updated = await getShareApplication(userId);
  if (!updated || updated.status !== 'under_review') {
    return { success: false, error: 'Reapply failed — possible race condition' };
  }

  await recordStatusHistory(
    updated.id,
    'rejected',
    'under_review',
    userId,
    'Reapplied with fresh 10p',
  );
  await logShareAudit(updated.id, userId, 'reapplied', `Reapply count: ${updated.reapply_count}`);

  return { success: true, application: updated };
}

// ── Share Guide functions ───────────────────────────────────────────────

/**
 * Get applications filtered by status for a guide's review queue.
 */
export async function getApplicationsForReview(
  statuses: ShareStatus[],
  limit = 50,
  offset = 0,
): Promise<ShareApplication[]> {
  const db = getDb();
  const placeholders = statuses.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT sa.*, u.name as user_name, u.email as user_email, u.country_code as user_country
          FROM share_applications sa
          JOIN users u ON u.id = sa.user_id
          WHERE sa.status IN (${placeholders})
          ORDER BY sa.updated_at ASC
          LIMIT ? OFFSET ?`,
    args: [...statuses, limit, offset],
  });
  return result.rows as unknown as ShareApplication[];
}

/**
 * Share Guide approves application.
 * Self-review guard: guide cannot approve their own application.
 * under_review → approved
 */
export async function approveShareApplication(
  applicationId: string,
  guideId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'under_review') {
    return { success: false, error: `Cannot approve — current status is ${app.status}` };
  }
  if (app.user_id === guideId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'approved',
              share_guide_id = ?,
              share_guide_decision_at = datetime('now'),
              share_guide_notes = ?,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'under_review'`,
    args: [guideId, notes ? sanitizeText(notes) : null, applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'under_review', 'approved', guideId, notes);
  await logShareAudit(applicationId, guideId, 'approved', notes);
  return { success: true };
}

/**
 * Share Guide rejects application. Auto-refunds 10p.
 * under_review → rejected
 */
export async function rejectShareApplication(
  applicationId: string,
  guideId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'under_review') {
    return { success: false, error: `Cannot reject — current status is ${app.status}` };
  }
  if (app.user_id === guideId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  // Auto-refund
  if (app.payment_transaction_id) {
    await refundSharePayment(app, guideId);
  }

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'rejected',
              share_guide_id = ?,
              share_guide_decision_at = datetime('now'),
              share_guide_notes = ?,
              rejection_reason = ?,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'under_review'`,
    args: [guideId, null, sanitizeText(reason), applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'under_review', 'rejected', guideId, reason);
  await logShareAudit(applicationId, guideId, 'rejected', reason);
  return { success: true };
}

// ── Identity functions ──────────────────────────────────────────────────

export interface IdentitySubmission {
  legalFirstName: string;
  legalMiddleName?: string | null;
  legalLastName: string;
  dateOfBirth: string;
  gender?: ShareGender | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince?: string | null;
  postalCode?: string | null;
  countryCode: string;
  phone: string;
  idDocumentType?: IdDocumentType | null;
  idDocumentCountry?: string | null;
}

/**
 * Submit identity verification data. Encrypts PII fields.
 * approved → identity_submitted
 */
export async function submitIdentity(
  userId: string,
  data: IdentitySubmission,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplication(userId);
  if (!app) return { success: false, error: 'No share application found' };
  if (app.status !== 'approved') {
    return { success: false, error: `Cannot submit identity — current status is ${app.status}` };
  }

  const db = getDb();
  const id = generateId();

  // Encrypt PII fields
  const encrypted = encryptIdentityFields({
    legal_first_name: sanitizeText(data.legalFirstName),
    legal_middle_name: data.legalMiddleName ? sanitizeText(data.legalMiddleName) : null,
    legal_last_name: sanitizeText(data.legalLastName),
    date_of_birth: sanitizeText(data.dateOfBirth),
    address_line_1: sanitizeText(data.addressLine1),
    address_line_2: data.addressLine2 ? sanitizeText(data.addressLine2) : null,
    city: sanitizeText(data.city),
    state_province: data.stateProvince ? sanitizeText(data.stateProvince) : null,
    postal_code: data.postalCode ? sanitizeText(data.postalCode) : null,
    phone: sanitizeText(data.phone),
  });

  // Determine digital verification availability by country tier
  const digitalVerification = getIdVerificationTier(data.countryCode) === 'digital' ? 1 : 0;

  await db.batch([
    {
      sql: `INSERT OR REPLACE INTO share_identities
            (id, application_id, user_id, legal_first_name, legal_middle_name, legal_last_name,
             date_of_birth, gender, address_line_1, address_line_2, city, state_province,
             postal_code, country_code, phone, id_document_type, id_document_country,
             digital_verification_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        app.id,
        userId,
        encrypted.legal_first_name ?? null,
        encrypted.legal_middle_name ?? null,
        encrypted.legal_last_name ?? null,
        encrypted.date_of_birth ?? null,
        data.gender ?? null,
        encrypted.address_line_1 ?? null,
        encrypted.address_line_2 ?? null,
        encrypted.city ?? null,
        encrypted.state_province ?? null,
        encrypted.postal_code ?? null,
        data.countryCode,
        encrypted.phone ?? null,
        data.idDocumentType ?? null,
        data.idDocumentCountry ?? null,
        digitalVerification,
      ],
    },
    {
      sql: `UPDATE share_applications
            SET status = 'identity_submitted', updated_at = datetime('now')
            WHERE id = ? AND status = 'approved'`,
      args: [app.id],
    },
  ]);

  await recordStatusHistory(
    app.id,
    'approved',
    'identity_submitted',
    userId,
    'Identity form submitted',
  );
  await logShareAudit(app.id, userId, 'identity_submitted', `Country: ${data.countryCode}`);
  return { success: true };
}

/**
 * Get decrypted identity for an application. Logs PII access.
 */
export async function getShareIdentity(
  applicationId: string,
  requesterId: string,
): Promise<ShareIdentity | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM share_identities WHERE application_id = ?',
    args: [applicationId],
  });
  if (!result.rows[0]) return null;

  // Log PII access
  await logShareAudit(applicationId, requesterId, 'viewed_identity', null);

  const row = result.rows[0] as unknown as Record<string, string | number | null>;
  const decrypted = decryptIdentityFields(row);
  return decrypted as unknown as ShareIdentity;
}

// ── Compliance functions ────────────────────────────────────────────────

/**
 * Compliance Guide approves — issues certificate.
 * identity_submitted → issued
 */
export async function approveCompliance(
  applicationId: string,
  guideId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string; certificateNumber?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'identity_submitted') {
    return { success: false, error: `Cannot approve compliance — current status is ${app.status}` };
  }
  if (app.user_id === guideId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  // Generate certificate number atomically
  const certNumber = await generateCertificateNumber();

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'issued',
              compliance_guide_id = ?,
              compliance_decision_at = datetime('now'),
              compliance_notes = ?,
              certificate_number = ?,
              issued_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND status = 'identity_submitted'`,
    args: [guideId, notes ? sanitizeText(notes) : null, certNumber, applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'identity_submitted', 'issued', guideId, notes);
  await logShareAudit(applicationId, guideId, 'issued', `Certificate: ${certNumber}`);
  return { success: true, certificateNumber: certNumber };
}

/**
 * Compliance Guide rejects — auto-refunds 10p.
 * identity_submitted → rejected
 */
export async function rejectCompliance(
  applicationId: string,
  guideId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'identity_submitted') {
    return { success: false, error: `Cannot reject — current status is ${app.status}` };
  }
  if (app.user_id === guideId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  if (app.payment_transaction_id) {
    await refundSharePayment(app, guideId);
  }

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'rejected',
              compliance_guide_id = ?,
              compliance_decision_at = datetime('now'),
              rejection_reason = ?,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'identity_submitted'`,
    args: [guideId, sanitizeText(reason), applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'identity_submitted', 'rejected', guideId, reason);
  await logShareAudit(applicationId, guideId, 'compliance_rejected', reason);
  return { success: true };
}

/**
 * Compliance forwards to Senior Compliance.
 * identity_submitted → forwarded_senior
 */
export async function forwardToSenior(
  applicationId: string,
  guideId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'identity_submitted') {
    return { success: false, error: `Cannot forward — current status is ${app.status}` };
  }
  if (app.user_id === guideId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'forwarded_senior',
              compliance_guide_id = ?,
              compliance_notes = ?,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'identity_submitted'`,
    args: [guideId, sanitizeText(notes), applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(
    applicationId,
    'identity_submitted',
    'forwarded_senior',
    guideId,
    notes,
  );
  await logShareAudit(applicationId, guideId, 'forwarded_senior', notes);
  return { success: true };
}

// ── Senior Compliance functions ─────────────────────────────────────────

/**
 * Senior Compliance approves — issues certificate.
 * forwarded_senior → issued
 */
export async function approveSenior(
  applicationId: string,
  seniorId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string; certificateNumber?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'forwarded_senior') {
    return { success: false, error: `Cannot approve — current status is ${app.status}` };
  }
  if (app.user_id === seniorId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  const certNumber = await generateCertificateNumber();

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'issued',
              senior_compliance_id = ?,
              senior_decision_at = datetime('now'),
              senior_notes = ?,
              certificate_number = ?,
              issued_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND status = 'forwarded_senior'`,
    args: [seniorId, notes ? sanitizeText(notes) : null, certNumber, applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'forwarded_senior', 'issued', seniorId, notes);
  await logShareAudit(applicationId, seniorId, 'senior_issued', `Certificate: ${certNumber}`);
  return { success: true, certificateNumber: certNumber };
}

/**
 * Senior Compliance rejects — auto-refunds 10p.
 * forwarded_senior → rejected
 */
export async function rejectSenior(
  applicationId: string,
  seniorId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const app = await getShareApplicationById(applicationId);
  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'forwarded_senior') {
    return { success: false, error: `Cannot reject — current status is ${app.status}` };
  }
  if (app.user_id === seniorId) {
    return { success: false, error: 'Cannot review your own application' };
  }

  if (app.payment_transaction_id) {
    await refundSharePayment(app, seniorId);
  }

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE share_applications
          SET status = 'rejected',
              senior_compliance_id = ?,
              senior_decision_at = datetime('now'),
              senior_notes = ?,
              rejection_reason = ?,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'forwarded_senior'`,
    args: [seniorId, null, sanitizeText(reason), applicationId],
  });

  if (result.rowsAffected === 0) return { success: false, error: 'Status transition failed' };

  await recordStatusHistory(applicationId, 'forwarded_senior', 'rejected', seniorId, reason);
  await logShareAudit(applicationId, seniorId, 'senior_rejected', reason);
  return { success: true };
}

// ── Messages ────────────────────────────────────────────────────────────

export async function createShareMessage(
  applicationId: string,
  senderId: string,
  senderRole: ShareSenderRole,
  content: string,
): Promise<ShareMessage> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO share_messages (id, application_id, sender_id, sender_role, content)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, applicationId, senderId, senderRole, sanitizeText(content)],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM share_messages WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as ShareMessage;
}

/**
 * Get messages for an application, filtered by what the requesting role can see.
 * - applicant: sees messages from self + share_guide
 * - share_guide: sees messages from applicant + self
 * - compliance_guide: sees messages from applicant + self + share_guide
 * - senior_compliance: sees all
 */
export async function getShareMessages(
  applicationId: string,
  visibleToRole: ShareSenderRole,
  limit = 100,
  offset = 0,
): Promise<ShareMessage[]> {
  const db = getDb();

  let roleFilter: string[];
  switch (visibleToRole) {
    case 'applicant':
      roleFilter = ['applicant', 'share_guide'];
      break;
    case 'share_guide':
      roleFilter = ['applicant', 'share_guide'];
      break;
    case 'compliance_guide':
      roleFilter = ['applicant', 'share_guide', 'compliance_guide'];
      break;
    case 'senior_compliance':
      roleFilter = ['applicant', 'share_guide', 'compliance_guide', 'senior_compliance'];
      break;
    default:
      roleFilter = ['applicant'];
  }

  const placeholders = roleFilter.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT * FROM share_messages
          WHERE application_id = ? AND sender_role IN (${placeholders})
          ORDER BY created_at ASC
          LIMIT ? OFFSET ?`,
    args: [applicationId, ...roleFilter, limit, offset],
  });
  return result.rows as unknown as ShareMessage[];
}

// ── Audit & History ─────────────────────────────────────────────────────

export async function logShareAudit(
  applicationId: string,
  actorId: string,
  action: string,
  detail?: string | null,
): Promise<void> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO share_audit_log (id, application_id, actor_id, action, detail)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, applicationId, actorId, action, detail ?? null],
  });
}

export async function recordStatusHistory(
  applicationId: string,
  fromStatus: string,
  toStatus: string,
  actorId: string,
  notes?: string | null,
): Promise<void> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO share_status_history (id, application_id, from_status, to_status, actor_id, notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, applicationId, fromStatus, toStatus, actorId, notes ?? null],
  });
}

export async function getShareAuditLog(
  applicationId: string,
  limit = 100,
  offset = 0,
): Promise<ShareAuditEntry[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM share_audit_log
          WHERE application_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [applicationId, limit, offset],
  });
  return result.rows as unknown as ShareAuditEntry[];
}

export async function getShareStatusHistory(applicationId: string): Promise<ShareStatusHistory[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM share_status_history
          WHERE application_id = ?
          ORDER BY created_at ASC`,
    args: [applicationId],
  });
  return result.rows as unknown as ShareStatusHistory[];
}

// ── Stats & Treasury ────────────────────────────────────────────────────

export interface ShareStats {
  total: number;
  byStatus: Record<string, number>;
}

export async function getShareStats(): Promise<ShareStats> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT status, COUNT(*) as count FROM share_applications GROUP BY status`,
    args: [],
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of result.rows) {
    const status = row.status as string;
    const count = Number(row.count);
    byStatus[status] = count;
    total += count;
  }

  return { total, byStatus };
}

export async function getTreasuryTransactions(
  limit = 50,
  offset = 0,
): Promise<WalletTransaction[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM wallet_transactions
          WHERE wallet_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [TREASURY_WALLET_ID, limit, offset],
  });
  return result.rows as unknown as WalletTransaction[];
}

export async function getTreasuryBalance(): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT balance_pence FROM wallets WHERE id = ?',
    args: [TREASURY_WALLET_ID],
  });
  return Number(result.rows[0]?.balance_pence) || 0;
}

// ── Certificate number generation ───────────────────────────────────────

/**
 * Generate the next certificate number atomically.
 * Format: QR-{YYYYMM}-{SEQ} e.g. QR-202603-00001
 */
export async function generateCertificateNumber(): Promise<string> {
  const db = getDb();

  // Atomically increment the counter
  await db.execute({
    sql: 'UPDATE share_certificate_counter SET next_number = next_number + 1 WHERE id = 1',
    args: [],
  });

  // Read the value we just incremented from
  const result = await db.execute({
    sql: 'SELECT next_number FROM share_certificate_counter WHERE id = 1',
    args: [],
  });

  // The seq is (next_number - 1) because we already incremented
  const seq = Number(result.rows[0]?.next_number) - 1;
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `QR-${yyyymm}-${String(seq).padStart(5, '0')}`;
}

// ── Refund helper ───────────────────────────────────────────────────────

async function refundSharePayment(app: ShareApplication, actorId: string): Promise<void> {
  const db = getDb();

  // Find the user's wallet
  const walletResult = await db.execute({
    sql: 'SELECT id FROM wallets WHERE user_id = ?',
    args: [app.user_id],
  });
  const userWallet = walletResult.rows[0];
  if (!userWallet) return; // No wallet to refund to — shouldn't happen

  const refundTxId = generateId();
  const amount = app.payment_amount_pence || SHARE_COST_PENCE;

  await db.batch([
    // Credit user wallet
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence + ?, updated_at = datetime('now')
            WHERE user_id = ?`,
      args: [amount, app.user_id],
    },
    // Debit treasury
    {
      sql: `UPDATE wallets SET balance_pence = balance_pence - ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [amount, TREASURY_WALLET_ID],
    },
    // Record refund transaction
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description, completed_at)
            VALUES (?, ?, 'refund', ?, 'Share consideration refund', datetime('now'))`,
      args: [refundTxId, userWallet.id as string, amount],
    },
  ]);

  await logShareAudit(app.id, actorId, 'refunded', `Refunded ${amount}p to wallet`);
}

// ── ID Verification tier ────────────────────────────────────────────────

type VerificationTier = 'digital' | 'limited' | 'unavailable';

/**
 * Determine the ID verification tier based on country code.
 * Digital: countries with robust electronic ID systems.
 * Limited: countries with some digital ID but limited coverage.
 * Unavailable: countries with no digital verification — requires manual/postal.
 */
export function getIdVerificationTier(countryCode: string): VerificationTier {
  const digitalCountries = new Set([
    'GB',
    'US',
    'CA',
    'AU',
    'NZ',
    'DE',
    'FR',
    'IT',
    'ES',
    'NL',
    'BE',
    'AT',
    'CH',
    'SE',
    'NO',
    'DK',
    'FI',
    'IE',
    'PT',
    'PL',
    'CZ',
    'SK',
    'HU',
    'RO',
    'BG',
    'HR',
    'SI',
    'LT',
    'LV',
    'EE',
    'JP',
    'KR',
    'SG',
    'HK',
    'TW',
    'IL',
    'AE',
    'SA',
    'IN',
    'BR',
    'MX',
    'ZA',
  ]);

  const limitedCountries = new Set([
    'CN',
    'RU',
    'TR',
    'TH',
    'MY',
    'PH',
    'ID',
    'VN',
    'NG',
    'KE',
    'GH',
    'EG',
    'MA',
    'TN',
    'CO',
    'AR',
    'CL',
    'PE',
    'PK',
    'BD',
    'LK',
    'UA',
    'KZ',
    'GE',
    'QA',
    'KW',
    'BH',
    'OM',
  ]);

  if (digitalCountries.has(countryCode)) return 'digital';
  if (limitedCountries.has(countryCode)) return 'limited';
  return 'unavailable';
}
