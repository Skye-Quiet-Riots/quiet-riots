import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Wallet, WalletTransaction, Campaign } from '@/types';

export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [userId],
  });
  return (result.rows[0] as unknown as Wallet) ?? null;
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const existing = await getWalletByUserId(userId);
  if (existing) return existing;

  // Verify user exists before attempting INSERT (FK constraint on user_id)
  const db = getDb();
  const userCheck = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [userId],
  });
  if (userCheck.rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO wallets (id, user_id) VALUES (?, ?)',
    args: [id, userId],
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
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description)
          VALUES (?, ?, 'topup', ?, 'Wallet top-up (pending)')`,
    args: [id, walletId, amountPence],
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

  // Credit the wallet and update the transaction
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
              description = 'Wallet top-up'
            WHERE id = ?`,
      args: [stripePaymentId ?? null, transactionId],
    },
  ]);
}

export async function createContribution(
  userId: string,
  campaignId: string,
  amountPence: number,
): Promise<{ transaction: WalletTransaction; campaign: Campaign }> {
  const db = getDb();

  // Get wallet and campaign
  const [walletResult, campaignResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM wallets WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM campaigns WHERE id = ?', args: [campaignId] }),
  ]);

  const wallet = walletResult.rows[0] as unknown as Wallet | undefined;
  if (!wallet) throw new Error('Wallet not found');

  const campaign = campaignResult.rows[0] as unknown as Campaign | undefined;
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status !== 'active') throw new Error('Campaign is not active');
  if (wallet.balance_pence < amountPence) throw new Error('Insufficient funds');

  const txId = generateId();

  // Atomic: debit wallet + credit campaign + record transaction
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
      sql: `UPDATE campaigns SET
              raised_pence = raised_pence + ?,
              contributor_count = contributor_count + 1
            WHERE id = ?`,
      args: [amountPence, campaignId],
    },
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, campaign_id, issue_id, description)
            VALUES (?, ?, 'contribute', ?, ?, ?, ?)`,
      args: [txId, wallet.id, amountPence, campaignId, campaign.issue_id, campaign.title],
    },
  ]);

  // Check if campaign just hit target
  const updatedCampaign = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [campaignId],
  });
  const campaignAfter = updatedCampaign.rows[0] as unknown as Campaign;

  if (
    campaignAfter.raised_pence >= campaignAfter.target_pence &&
    campaignAfter.status === 'active'
  ) {
    await db.execute({
      sql: "UPDATE campaigns SET status = 'funded', funded_at = datetime('now') WHERE id = ?",
      args: [campaignId],
    });
    campaignAfter.status = 'funded';
  }

  const txResult = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE id = ?',
    args: [txId],
  });
  const transaction = txResult.rows[0] as unknown as WalletTransaction;

  return { transaction, campaign: campaignAfter };
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
          WHERE w.user_id = ? AND wt.type = 'contribute'`,
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
