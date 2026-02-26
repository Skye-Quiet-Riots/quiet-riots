import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Wallet, WalletTransaction, ActionInitiative, ExchangeRate } from '@/types';

export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [userId],
  });
  return (result.rows[0] as unknown as Wallet) ?? null;
}

/**
 * Get or create a wallet for a user. Currency is determined by the user's
 * country (looked up from the countries table) or defaults to GBP.
 */
export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const existing = await getWalletByUserId(userId);
  if (existing) return existing;

  // Verify user exists and get their country to determine currency
  const db = getDb();
  const userCheck = await db.execute({
    sql: `SELECT u.id, c.currency_code
          FROM users u
          LEFT JOIN countries c ON u.country_code = c.code
          WHERE u.id = ?`,
    args: [userId],
  });
  if (userCheck.rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  const currency =
    (userCheck.rows[0] as unknown as { currency_code: string | null }).currency_code || 'GBP';
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO wallets (id, user_id, currency) VALUES (?, ?, ?)',
    args: [id, userId, currency],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM wallets WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Wallet;
}

export async function getWalletTransactions(
  walletId: string,
  limit = 20,
): Promise<WalletTransaction[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [walletId, limit],
  });
  return result.rows as unknown as WalletTransaction[];
}

export async function createTopupTransaction(
  walletId: string,
  amountPence: number,
): Promise<{ transaction: WalletTransaction; paymentUrl: string }> {
  const db = getDb();

  // Look up the wallet's currency for the transaction
  const walletResult = await db.execute({
    sql: 'SELECT currency FROM wallets WHERE id = ?',
    args: [walletId],
  });
  const walletCurrency =
    (walletResult.rows[0] as unknown as { currency: string } | undefined)?.currency || 'GBP';

  const id = generateId();
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, currency_code, description)
          VALUES (?, ?, 'topup', ?, ?, 'Wallet top-up (pending)')`,
    args: [id, walletId, amountPence, walletCurrency],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE id = ?',
    args: [id],
  });
  const transaction = result.rows[0] as unknown as WalletTransaction;

  // Stub: return placeholder URL. Real Stripe Checkout integration later.
  const paymentUrl = `https://pay.quietriots.app/topup/${id}`;

  return { transaction, paymentUrl };
}

/**
 * Complete a topup transaction and credit the wallet.
 * Idempotent: if already completed (completed_at is set), returns without double-crediting.
 */
export async function completeTopup(
  transactionId: string,
  stripePaymentId?: string,
): Promise<void> {
  const db = getDb();

  // Get the transaction to find the wallet and amount
  const txResult = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE id = ?',
    args: [transactionId],
  });
  const tx = txResult.rows[0] as unknown as WalletTransaction | undefined;
  if (!tx) throw new Error('Transaction not found');

  // Idempotency guard: if already completed, return silently
  if (tx.completed_at) return;

  // Credit the wallet and mark transaction as completed
  await db.batch([
    {
      sql: `UPDATE wallets SET
              balance_pence = balance_pence + ?,
              total_loaded_pence = total_loaded_pence + ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [tx.amount_pence, tx.amount_pence, tx.wallet_id],
    },
    {
      sql: `UPDATE wallet_transactions SET
              stripe_payment_id = ?,
              description = 'Wallet top-up',
              completed_at = datetime('now')
            WHERE id = ? AND completed_at IS NULL`,
      args: [stripePaymentId ?? null, transactionId],
    },
  ]);
}

export async function createPayment(
  userId: string,
  actionInitiativeId: string,
  amountPence: number,
): Promise<{ transaction: WalletTransaction; actionInitiative: ActionInitiative }> {
  const db = getDb();

  // Get wallet and action initiative
  const [walletResult, aiResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM wallets WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM action_initiatives WHERE id = ?', args: [actionInitiativeId] }),
  ]);

  const wallet = walletResult.rows[0] as unknown as Wallet | undefined;
  if (!wallet) throw new Error('Wallet not found');

  const actionInitiative = aiResult.rows[0] as unknown as ActionInitiative | undefined;
  if (!actionInitiative) throw new Error('Action initiative not found');

  if (actionInitiative.status !== 'active') throw new Error('Action initiative is not active');
  if (wallet.balance_pence < amountPence) throw new Error('Insufficient funds');

  const txId = generateId();

  // Atomic: debit wallet + credit action initiative + record transaction
  await db.batch([
    {
      sql: `UPDATE wallets SET
              balance_pence = balance_pence - ?,
              total_spent_pence = total_spent_pence + ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [amountPence, amountPence, wallet.id],
    },
    {
      sql: `UPDATE action_initiatives SET
              committed_pence = committed_pence + ?,
              supporter_count = supporter_count + 1
            WHERE id = ?`,
      args: [amountPence, actionInitiativeId],
    },
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, action_initiative_id, issue_id, currency_code, completed_at, description)
            VALUES (?, ?, 'payment', ?, ?, ?, ?, datetime('now'), ?)`,
      args: [
        txId,
        wallet.id,
        amountPence,
        actionInitiativeId,
        actionInitiative.issue_id,
        wallet.currency,
        actionInitiative.title,
      ],
    },
  ]);

  // Check if action initiative just hit target
  const updatedAi = await db.execute({
    sql: 'SELECT * FROM action_initiatives WHERE id = ?',
    args: [actionInitiativeId],
  });
  const aiAfter = updatedAi.rows[0] as unknown as ActionInitiative;

  if (
    aiAfter.committed_pence >= aiAfter.target_pence &&
    aiAfter.status === 'active'
  ) {
    await db.execute({
      sql: "UPDATE action_initiatives SET status = 'goal_reached', goal_reached_at = datetime('now') WHERE id = ?",
      args: [actionInitiativeId],
    });
    aiAfter.status = 'goal_reached';
  }

  const txResult = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE id = ?',
    args: [txId],
  });
  const transaction = txResult.rows[0] as unknown as WalletTransaction;

  return { transaction, actionInitiative: aiAfter };
}

export async function getUserSpendingSummary(
  userId: string,
): Promise<{ totalSpent: number; issuesSupported: number; transactionCount: number }> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT
            COALESCE(SUM(wt.amount_pence), 0) as total_spent,
            COUNT(DISTINCT wt.issue_id) as issues_supported,
            COUNT(*) as transaction_count
          FROM wallet_transactions wt
          JOIN wallets w ON wt.wallet_id = w.id
          WHERE w.user_id = ? AND wt.type = 'payment'`,
    args: [userId],
  });
  const row = result.rows[0] as unknown as {
    total_spent: number;
    issues_supported: number;
    transaction_count: number;
  };
  return {
    totalSpent: Number(row.total_spent),
    issuesSupported: Number(row.issues_supported),
    transactionCount: Number(row.transaction_count),
  };
}

// Exchange rate queries

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT rate, updated_at FROM exchange_rates WHERE from_currency = ? AND to_currency = ?',
    args: [fromCurrency, toCurrency],
  });
  const row = result.rows[0] as unknown as ExchangeRate | undefined;
  return row?.rate ?? null;
}

export async function upsertExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(from_currency, to_currency)
          DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at`,
    args: [fromCurrency, toCurrency, rate],
  });
}

export async function getAllExchangeRates(): Promise<ExchangeRate[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM exchange_rates ORDER BY from_currency, to_currency',
    args: [],
  });
  return result.rows as unknown as ExchangeRate[];
}
