import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type {
  UserConsent,
  LegalDocument,
  NotificationPreferences,
  LoginEvent,
  LoginEventType,
  ConsentType,
  LegalDocumentType,
  User,
} from '@/types';

// ---------- Consent ----------

export async function recordConsent(
  userId: string,
  documentType: ConsentType,
  version: string,
  countryCode: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<UserConsent> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO user_consents (id, user_id, document_type, version, country_code, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, documentType, version, countryCode, ipAddress ?? null, userAgent ?? null],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM user_consents WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as UserConsent;
}

export async function getUserConsents(userId: string): Promise<UserConsent[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_consents WHERE user_id = ? ORDER BY accepted_at DESC',
    args: [userId],
  });
  return result.rows as unknown as UserConsent[];
}

export async function getLatestConsent(
  userId: string,
  documentType: ConsentType,
): Promise<UserConsent | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM user_consents
          WHERE user_id = ? AND document_type = ?
          ORDER BY accepted_at DESC
          LIMIT 1`,
    args: [userId, documentType],
  });
  return (result.rows[0] as unknown as UserConsent) ?? null;
}

// ---------- Legal Documents ----------

export async function getLegalDocument(
  countryCode: string,
  documentType: LegalDocumentType,
): Promise<LegalDocument | null> {
  const db = getDb();
  // Try country-specific first, then fall back to '***' (global)
  const result = await db.execute({
    sql: `SELECT * FROM legal_documents
          WHERE document_type = ?
            AND country_code IN (?, '***')
          ORDER BY
            CASE WHEN country_code = ? THEN 0 ELSE 1 END,
            effective_date DESC
          LIMIT 1`,
    args: [documentType, countryCode, countryCode],
  });
  return (result.rows[0] as unknown as LegalDocument) ?? null;
}

// ---------- Notification Preferences ----------

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM notification_preferences WHERE user_id = ?',
    args: [userId],
  });
  if (result.rows.length > 0) {
    return result.rows[0] as unknown as NotificationPreferences;
  }
  // Create defaults
  await db.execute({
    sql: `INSERT INTO notification_preferences (user_id, security, product_updates, action_initiative_updates, weekly_digest)
          VALUES (?, 1, 1, 1, 0)`,
    args: [userId],
  });
  return {
    user_id: userId,
    security: 1,
    product_updates: 1,
    action_initiative_updates: 1,
    weekly_digest: 0,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferences, 'user_id'>>,
): Promise<NotificationPreferences> {
  const db = getDb();
  // Ensure the row exists first
  await getNotificationPreferences(userId);

  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (prefs.security !== undefined) {
    sets.push('security = ?');
    args.push(prefs.security);
  }
  if (prefs.product_updates !== undefined) {
    sets.push('product_updates = ?');
    args.push(prefs.product_updates);
  }
  if (prefs.action_initiative_updates !== undefined) {
    sets.push('action_initiative_updates = ?');
    args.push(prefs.action_initiative_updates);
  }
  if (prefs.weekly_digest !== undefined) {
    sets.push('weekly_digest = ?');
    args.push(prefs.weekly_digest);
  }

  if (sets.length > 0) {
    args.push(userId);
    await db.execute({
      sql: `UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = ?`,
      args,
    });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM notification_preferences WHERE user_id = ?',
    args: [userId],
  });
  return result.rows[0] as unknown as NotificationPreferences;
}

// ---------- Login Events ----------

export async function logLoginEvent(
  userId: string | null,
  eventType: LoginEventType,
  ipAddress?: string,
  userAgent?: string,
  provider?: string,
): Promise<LoginEvent> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO login_events (id, user_id, event_type, ip_address, user_agent, provider)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, eventType, ipAddress ?? null, userAgent ?? null, provider ?? null],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM login_events WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as LoginEvent;
}

export async function getLoginEvents(userId: string, limit = 50): Promise<LoginEvent[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM login_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [userId, limit],
  });
  return result.rows as unknown as LoginEvent[];
}

// ---------- Account Management ----------

export async function deactivateAccount(userId: string): Promise<User | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE users SET status = 'deactivated', deactivated_at = datetime('now') WHERE id = ?`,
    args: [userId],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function reactivateAccount(userId: string): Promise<User | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE users SET status = 'active', deactivated_at = NULL WHERE id = ?`,
    args: [userId],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });
  return (result.rows[0] as unknown as User) ?? null;
}

/**
 * Hard-delete all user data across every table, then remove the user row.
 * Uses db.batch() for atomicity where possible. Order matters due to
 * foreign key constraints.
 */
export async function hardDeleteUser(userId: string): Promise<void> {
  const db = getDb();

  // First, get the wallet id (needed for wallet_transactions)
  const walletResult = await db.execute({
    sql: 'SELECT id FROM wallets WHERE user_id = ?',
    args: [userId],
  });
  const walletId = (walletResult.rows[0] as unknown as { id: string } | undefined)?.id ?? null;

  // Batch delete from all related tables
  const statements: { sql: string; args: (string | null)[] }[] = [
    { sql: 'DELETE FROM messages WHERE recipient_id = ?', args: [userId] },
    { sql: 'DELETE FROM issue_suggestions WHERE suggested_by = ?', args: [userId] },
    { sql: 'DELETE FROM user_roles WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM user_memory WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM user_consents WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM notification_preferences WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM login_events WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM accounts WHERE user_id = ?', args: [userId] },
    {
      sql: 'DELETE FROM verification_tokens WHERE identifier = (SELECT email FROM users WHERE id = ?)',
      args: [userId],
    },
    { sql: 'DELETE FROM assistant_claims WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM user_assistant_introductions WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM reel_votes WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM reel_shown_log WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM evidence_comments WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM evidence WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM feed WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM user_issues WHERE user_id = ?', args: [userId] },
    {
      sql: 'DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?',
      args: [userId, userId],
    },
    { sql: 'DELETE FROM reports WHERE reporter_id = ?', args: [userId] },
  ];

  // Wallet transactions depend on wallet existing
  if (walletId) {
    statements.push({
      sql: 'DELETE FROM wallet_transactions WHERE wallet_id = ?',
      args: [walletId],
    });
    statements.push({ sql: 'DELETE FROM wallets WHERE id = ?', args: [walletId] });
  }

  // Nullify user_id in bot_events rather than deleting the analytics
  statements.push({
    sql: 'UPDATE bot_events SET user_id = NULL WHERE user_id = ?',
    args: [userId],
  });

  // Nullify first_rioter_id on issues/orgs (the entities persist independently)
  statements.push({
    sql: 'UPDATE issues SET first_rioter_id = NULL WHERE first_rioter_id = ?',
    args: [userId],
  });
  statements.push({
    sql: 'UPDATE organisations SET first_rioter_id = NULL WHERE first_rioter_id = ?',
    args: [userId],
  });

  // Nullify assigned_by in user_roles (the role assignments for other users persist)
  statements.push({
    sql: 'UPDATE user_roles SET assigned_by = NULL WHERE assigned_by = ?',
    args: [userId],
  });

  // Finally, delete the user row
  statements.push({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });

  await db.batch(statements);
}

// ---------- Data Export ----------

export interface UserDataExport {
  profile: User;
  consents: UserConsent[];
  loginEvents: LoginEvent[];
  notificationPreferences: NotificationPreferences;
  joinedIssues: { issue_id: string; issue_name: string; joined_at: string }[];
  feedPosts: { id: string; issue_id: string; content: string; likes: number; created_at: string }[];
  wallet: {
    balance_pence: number;
    currency: string;
    total_loaded_pence: number;
    total_spent_pence: number;
    transactions: {
      id: string;
      type: string;
      amount_pence: number;
      currency_code: string;
      description: string;
      completed_at: string | null;
      created_at: string;
    }[];
  } | null;
  evidence: {
    id: string;
    issue_id: string;
    content: string;
    media_type: string;
    created_at: string;
  }[];
  assistantIntroductions: { category: string; introduced_at: string }[];
  connectedAccounts: { provider: string; type: string }[];
  memories: {
    memory_key: string;
    memory_value: string;
    category: string;
    updated_at: string;
  }[];
}

/**
 * Export all user data for GDPR / data portability requests.
 * Returns provider names only for connected accounts (no tokens).
 */
export async function exportUserData(userId: string): Promise<UserDataExport | null> {
  const db = getDb();

  // Get user profile first — if not found, bail early
  const userResult = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });
  const profile = (userResult.rows[0] as unknown as User) ?? null;
  if (!profile) return null;

  // Fetch everything in parallel
  const [
    consentsResult,
    loginEventsResult,
    issuesResult,
    feedResult,
    walletResult,
    evidenceResult,
    introductionsResult,
    accountsResult,
    memoriesResult,
  ] = await Promise.all([
    db.execute({
      sql: 'SELECT * FROM user_consents WHERE user_id = ? ORDER BY accepted_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM login_events WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: `SELECT ui.issue_id, i.name AS issue_name, ui.joined_at
            FROM user_issues ui
            JOIN issues i ON ui.issue_id = i.id
            WHERE ui.user_id = ?
            ORDER BY ui.joined_at DESC`,
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT id, issue_id, content, likes, created_at FROM feed WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM wallets WHERE user_id = ?',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT id, issue_id, content, media_type, created_at FROM evidence WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT category, introduced_at FROM user_assistant_introductions WHERE user_id = ? ORDER BY introduced_at ASC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT provider, type FROM accounts WHERE user_id = ?',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT memory_key, memory_value, category, updated_at FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC',
      args: [userId],
    }),
  ]);

  // Get notification preferences (creates defaults if missing)
  const notificationPreferences = await getNotificationPreferences(userId);

  // Get wallet transactions if wallet exists
  let walletData: UserDataExport['wallet'] = null;
  const walletRow = walletResult.rows[0] as unknown as
    | {
        id: string;
        balance_pence: number;
        currency: string;
        total_loaded_pence: number;
        total_spent_pence: number;
      }
    | undefined;

  if (walletRow) {
    const txResult = await db.execute({
      sql: `SELECT id, type, amount_pence, currency_code, description, completed_at, created_at
            FROM wallet_transactions
            WHERE wallet_id = ?
            ORDER BY created_at DESC`,
      args: [walletRow.id],
    });
    walletData = {
      balance_pence: walletRow.balance_pence,
      currency: walletRow.currency,
      total_loaded_pence: walletRow.total_loaded_pence,
      total_spent_pence: walletRow.total_spent_pence,
      transactions: txResult.rows as unknown as {
        id: string;
        type: string;
        amount_pence: number;
        currency_code: string;
        description: string;
        completed_at: string | null;
        created_at: string;
      }[],
    };
  }

  return {
    profile,
    consents: consentsResult.rows as unknown as UserConsent[],
    loginEvents: loginEventsResult.rows as unknown as LoginEvent[],
    notificationPreferences,
    joinedIssues: issuesResult.rows as unknown as UserDataExport['joinedIssues'],
    feedPosts: feedResult.rows as unknown as UserDataExport['feedPosts'],
    wallet: walletData,
    evidence: evidenceResult.rows as unknown as UserDataExport['evidence'],
    assistantIntroductions:
      introductionsResult.rows as unknown as UserDataExport['assistantIntroductions'],
    connectedAccounts: accountsResult.rows as unknown as UserDataExport['connectedAccounts'],
    memories: memoriesResult.rows as unknown as UserDataExport['memories'],
  };
}
