/**
 * merge-users.ts — Merge two user accounts
 *
 * Usage:
 *   npx tsx scripts/merge-users.ts --source <email-or-phone> --target <email-or-phone> [--dry-run] [--execute]
 *
 * The source user is soft-deleted and their data migrated to the target user.
 * Both --dry-run and --execute show a preview. --execute actually performs the merge.
 *
 * Example (Simon's merge):
 *   npx tsx scripts/merge-users.ts --source simon@simondarling.com --target +447974766838 --dry-run
 *   npx tsx scripts/merge-users.ts --source simon@simondarling.com --target +447974766838 --execute
 */

import { createClient } from '@libsql/client';

// ─── Parse args ────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}
const hasFlag = (name: string) => args.includes(`--${name}`);

const sourceIdentifier = getArg('source');
const targetIdentifier = getArg('target');
const isDryRun = hasFlag('dry-run');
const isExecute = hasFlag('execute');

if (!sourceIdentifier || !targetIdentifier) {
  console.error(
    'Usage: npx tsx scripts/merge-users.ts --source <email-or-phone> --target <email-or-phone> [--dry-run] [--execute]',
  );
  process.exit(1);
}

if (!isDryRun && !isExecute) {
  console.error('Must specify either --dry-run or --execute');
  process.exit(1);
}

// ─── DB connection ─────────────────────────────────────
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ TURSO_DATABASE_URL is not set. This script requires a remote database.');
  process.exit(1);
}

// Detect environment
const isProduction = url.includes('quiet-riots-skye') && !url.includes('staging');
const isStaging = url.includes('staging');
const env = isProduction ? '🔴 PRODUCTION' : isStaging ? '🟡 STAGING' : '🟢 LOCAL';
console.log(`\n  Database: ${env}`);
console.log(`  URL: ${url}\n`);

const db = createClient({ url, authToken });

// ─── Helpers ───────────────────────────────────────────
async function findUser(identifier: string) {
  // Phone number (starts with +)
  if (identifier.startsWith('+')) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE phone = ?',
      args: [identifier],
    });
    return result.rows[0] ?? null;
  }
  // Email
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
    args: [identifier],
  });
  return result.rows[0] ?? null;
}

// Tables with user_id foreign key
const USER_ID_TABLES = [
  { table: 'user_issues', column: 'user_id', hasUnique: true },
  { table: 'feed', column: 'user_id', hasUnique: false },
  { table: 'riot_reels', column: 'submitted_by', hasUnique: false },
  { table: 'reel_votes', column: 'user_id', hasUnique: true },
  { table: 'reel_shown_log', column: 'user_id', hasUnique: false },
  // wallets + wallet_transactions handled separately via wallet merge section below
  { table: 'user_assistant_introductions', column: 'user_id', hasUnique: true },
  { table: 'assistant_claims', column: 'user_id', hasUnique: false },
  { table: 'bot_events', column: 'user_id', hasUnique: false },
  { table: 'evidence', column: 'user_id', hasUnique: false },
  { table: 'evidence_comments', column: 'user_id', hasUnique: false },
  { table: 'accounts', column: 'user_id', hasUnique: false },
  { table: 'user_consents', column: 'user_id', hasUnique: false },
  { table: 'login_events', column: 'user_id', hasUnique: false },
  { table: 'user_blocks', column: 'blocker_id', hasUnique: false },
  { table: 'user_blocks', column: 'blocked_id', hasUnique: false },
  { table: 'reports', column: 'reporter_id', hasUnique: false },
  { table: 'user_interests', column: 'user_id', hasUnique: true },
  { table: 'user_memory', column: 'user_id', hasUnique: true },
  { table: 'user_roles', column: 'user_id', hasUnique: false },
  { table: 'issue_suggestions', column: 'suggested_by', hasUnique: false },
  { table: 'issue_suggestions', column: 'reviewer_id', hasUnique: false },
  { table: 'messages', column: 'recipient_id', hasUnique: false },
  { table: 'notification_preferences', column: 'user_id', hasUnique: true },
  { table: 'phone_verification_codes', column: 'user_id', hasUnique: false },
];

// ─── Main ──────────────────────────────────────────────
async function main() {
  const source = await findUser(sourceIdentifier!);
  const target = await findUser(targetIdentifier!);

  if (!source) {
    console.error(`❌ Source user not found: ${sourceIdentifier}`);
    process.exit(1);
  }
  if (!target) {
    console.error(`❌ Target user not found: ${targetIdentifier}`);
    process.exit(1);
  }
  // Coerce libSQL Value objects to plain JS types
  const sourceId = String(source.id);
  const targetId = String(target.id);
  const sourceEmail = String(source.email);
  const targetEmail_ = String(target.email);

  if (sourceId === targetId) {
    console.error('❌ Source and target are the same user');
    process.exit(1);
  }

  // Preview
  console.log('┌─────────────────────────────────────────────────');
  console.log('│ USER MERGE PREVIEW');
  console.log('├─────────────────────────────────────────────────');
  console.log('│ SOURCE (will be soft-deleted):');
  console.log(`│   ID:    ${source.id}`);
  console.log(`│   Name:  ${source.name}`);
  console.log(`│   Email: ${source.email}`);
  console.log(`│   Phone: ${source.phone || '(none)'}`);
  console.log(`│   Roles: ${source.status || 'active'}`);
  console.log('│');
  console.log('│ TARGET (will receive all data):');
  console.log(`│   ID:    ${target.id}`);
  console.log(`│   Name:  ${target.name}`);
  console.log(`│   Email: ${target.email}`);
  console.log(`│   Phone: ${target.phone || '(none)'}`);
  console.log(`│   Roles: ${target.status || 'active'}`);
  console.log('├─────────────────────────────────────────────────');

  // Count records to migrate
  console.log('│ RECORDS TO MIGRATE:');
  let totalRecords = 0;

  for (const { table, column } of USER_ID_TABLES) {
    if (table === 'wallet_transactions') continue; // Handled via wallet merge
    const count = await db.execute({
      sql: `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`,
      args: [sourceId],
    });
    const n = Number(count.rows[0].count);
    if (n > 0) {
      console.log(`│   ${table}.${column}: ${n} records`);
      totalRecords += n;
    }
  }

  // Check wallets
  const sourceWallet = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [sourceId],
  });
  const targetWallet = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [targetId],
  });

  let swBalance = 0,
    swSpent = 0,
    swTopup = 0,
    swId = '';
  if (sourceWallet.rows.length > 0) {
    const swRow = sourceWallet.rows[0];
    swBalance = Number(swRow.balance_pence);
    swSpent = Number(swRow.total_spent_pence);
    swTopup = Number(swRow.total_loaded_pence);
    swId = String(swRow.id);
    console.log(`│   wallets: balance=${swBalance}p, spent=${swSpent}p, topup=${swTopup}p`);

    const txCount = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?',
      args: [swId],
    });
    const txN = Number(txCount.rows[0].count);
    if (txN > 0) {
      console.log(`│   wallet_transactions: ${txN} records`);
      totalRecords += txN;
    }
  }

  console.log(`│   TOTAL: ${totalRecords} records`);
  console.log('│');

  // Determine what email to set on target
  const targetEmail = targetEmail_.startsWith('wa-') ? sourceEmail : targetEmail_;
  if (targetEmail !== targetEmail_) {
    console.log(`│ EMAIL UPGRADE: ${targetEmail_} → ${targetEmail}`);
  }

  console.log('└─────────────────────────────────────────────────');

  if (isDryRun) {
    console.log('\n  DRY RUN — no changes made. Use --execute to perform the merge.\n');
    process.exit(0);
  }

  // ─── Execute merge ─────────────────────────────────
  console.log('\n  EXECUTING MERGE...\n');

  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  // 1. Migrate FK references (use INSERT OR IGNORE for tables with UNIQUE constraints)
  for (const { table, column, hasUnique } of USER_ID_TABLES) {
    if (table === 'wallet_transactions') continue;

    const count = await db.execute({
      sql: `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`,
      args: [sourceId],
    });
    const n = Number(count.rows[0].count);
    if (n === 0) continue;

    if (hasUnique) {
      // For tables with UNIQUE constraints, try to update, then delete remaining conflicts
      statements.push({
        sql: `UPDATE OR IGNORE ${table} SET ${column} = ? WHERE ${column} = ?`,
        args: [targetId, sourceId],
      });
      // Clean up any remaining source records (conflicting duplicates)
      statements.push({
        sql: `DELETE FROM ${table} WHERE ${column} = ?`,
        args: [sourceId],
      });
    } else {
      statements.push({
        sql: `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`,
        args: [targetId, sourceId],
      });
    }
  }

  // 2. Merge wallets
  if (sourceWallet.rows.length > 0) {
    if (targetWallet.rows.length > 0) {
      const twId = String(targetWallet.rows[0].id);

      // Move transactions from source wallet to target wallet
      statements.push({
        sql: 'UPDATE wallet_transactions SET wallet_id = ? WHERE wallet_id = ?',
        args: [twId, swId],
      });

      // Add source balance to target
      statements.push({
        sql: `UPDATE wallets SET
              balance_pence = balance_pence + ?,
              total_spent_pence = total_spent_pence + ?,
              total_loaded_pence = total_loaded_pence + ?
              WHERE id = ?`,
        args: [swBalance, swSpent, swTopup, twId],
      });

      // Delete source wallet
      statements.push({
        sql: 'DELETE FROM wallets WHERE id = ?',
        args: [swId],
      });
    } else {
      // Target has no wallet — reassign source wallet
      statements.push({
        sql: 'UPDATE wallets SET user_id = ? WHERE id = ?',
        args: [targetId, swId],
      });
    }
  }

  // 3. Soft-delete source user (must come before email upgrade to free the email)
  const mergedEmail = `merged-${sourceId}@deleted.quietriots.com`;
  statements.push({
    sql: `UPDATE users SET
          status = 'deleted',
          merged_into_user_id = ?,
          email = ?,
          phone = NULL,
          phone_verified = 0
          WHERE id = ?`,
    args: [targetId, mergedEmail, sourceId],
  });

  // 4. Update target user email if wa-* upgrade (after source email is freed)
  if (targetEmail_.startsWith('wa-') && !sourceEmail.startsWith('wa-')) {
    statements.push({
      sql: 'UPDATE users SET email = ? WHERE id = ?',
      args: [sourceEmail, targetId],
    });
  }

  // Execute all in a batch
  try {
    await db.batch(statements.map((s) => ({ sql: s.sql, args: s.args })));
    console.log(`  ✅ Merge complete. ${statements.length} operations executed.`);
    console.log(`  Source user ${sourceId} → soft-deleted, email set to ${mergedEmail}`);
    console.log(`  Target user ${targetId} received all data.`);

    if (targetEmail_.startsWith('wa-') && !sourceEmail.startsWith('wa-')) {
      console.log(`  Target email upgraded: ${targetEmail_} → ${sourceEmail}`);
    }
  } catch (err) {
    console.error('  ❌ MERGE FAILED:', err);
    process.exit(1);
  }

  console.log('\n  Done.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
