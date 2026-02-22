import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getWalletByUserId,
  getOrCreateWallet,
  getWalletTransactions,
  createTopupTransaction,
  completeTopup,
  createContribution,
  getUserSpendingSummary,
} from './wallet';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getWalletByUserId', () => {
  it('returns wallet for user with existing wallet', async () => {
    const wallet = await getWalletByUserId('user-sarah');
    expect(wallet).not.toBeNull();
    expect(wallet!.id).toBe('wallet-sarah');
    expect(wallet!.balance_pence).toBe(500);
  });

  it('returns null for user without wallet', async () => {
    const wallet = await getWalletByUserId('user-marcio');
    expect(wallet).toBeNull();
  });
});

describe('getOrCreateWallet', () => {
  it('returns existing wallet', async () => {
    const wallet = await getOrCreateWallet('user-sarah');
    expect(wallet.id).toBe('wallet-sarah');
    expect(wallet.balance_pence).toBe(500);
  });

  it('creates wallet for user without one', async () => {
    const wallet = await getOrCreateWallet('user-marcio');
    expect(wallet).not.toBeNull();
    expect(wallet.user_id).toBe('user-marcio');
    expect(wallet.balance_pence).toBe(0);
    expect(wallet.currency).toBe('GBP');
  });

  it('returns same wallet on second call', async () => {
    const wallet1 = await getOrCreateWallet('user-marcio');
    const wallet2 = await getOrCreateWallet('user-marcio');
    expect(wallet1.id).toBe(wallet2.id);
  });
});

describe('getWalletTransactions', () => {
  it('returns transactions for wallet', async () => {
    const txs = await getWalletTransactions('wallet-sarah');
    expect(txs.length).toBe(2);
  });

  it('returns empty for wallet with no transactions', async () => {
    const wallet = await getOrCreateWallet('user-marcio');
    const txs = await getWalletTransactions(wallet.id);
    expect(txs.length).toBe(0);
  });
});

describe('createTopupTransaction', () => {
  it('creates a pending topup and returns payment URL', async () => {
    const { transaction, paymentUrl } = await createTopupTransaction('wallet-sarah', 500);
    expect(transaction.type).toBe('topup');
    expect(transaction.amount_pence).toBe(500);
    expect(transaction.wallet_id).toBe('wallet-sarah');
    expect(paymentUrl).toContain('https://pay.quietriots.app/topup/');
  });
});

describe('completeTopup', () => {
  it('credits wallet balance after topup', async () => {
    const { transaction } = await createTopupTransaction('wallet-sarah', 1000);
    const walletBefore = await getWalletByUserId('user-sarah');
    const balanceBefore = walletBefore!.balance_pence;

    await completeTopup(transaction.id, 'stripe_test_123');

    const walletAfter = await getWalletByUserId('user-sarah');
    expect(walletAfter!.balance_pence).toBe(balanceBefore + 1000);
    expect(walletAfter!.total_loaded_pence).toBeGreaterThan(walletBefore!.total_loaded_pence);
  });
});

describe('createContribution', () => {
  it('deducts from wallet and credits campaign', async () => {
    // First top up to ensure sufficient funds
    const { transaction: topupTx } = await createTopupTransaction('wallet-sarah', 2000);
    await completeTopup(topupTx.id);

    const walletBefore = await getWalletByUserId('user-sarah');
    const balanceBefore = walletBefore!.balance_pence;

    const result = await createContribution('user-sarah', 'camp-water-test', 100);
    expect(result.transaction.type).toBe('contribute');
    expect(result.transaction.amount_pence).toBe(100);
    expect(result.transaction.campaign_id).toBe('camp-water-test');
    expect(result.campaign.raised_pence).toBeGreaterThan(31000);

    const walletAfter = await getWalletByUserId('user-sarah');
    expect(walletAfter!.balance_pence).toBe(balanceBefore - 100);
  });

  it('throws error for insufficient funds', async () => {
    await expect(createContribution('user-sarah', 'camp-water-test', 999999)).rejects.toThrow(
      'Insufficient funds',
    );
  });

  it('throws error for non-existent campaign', async () => {
    await expect(createContribution('user-sarah', 'camp-nonexistent', 100)).rejects.toThrow(
      'Campaign not found',
    );
  });

  it('throws error for funded campaign', async () => {
    await expect(createContribution('user-sarah', 'camp-funded', 100)).rejects.toThrow(
      'Campaign is not active',
    );
  });

  it('marks campaign as funded when target is reached', async () => {
    // camp-almost-funded has target 10000, raised 9950 — needs 50 more
    const result = await createContribution('user-sarah', 'camp-almost-funded', 50);
    expect(result.campaign.status).toBe('funded');
  });
});

describe('getUserSpendingSummary', () => {
  it('returns spending summary', async () => {
    const summary = await getUserSpendingSummary('user-sarah');
    expect(summary.totalSpent).toBeGreaterThan(0);
    expect(summary.transactionCount).toBeGreaterThan(0);
    expect(typeof summary.issuesSupported).toBe('number');
  });

  it('returns zeroes for user with no contributions', async () => {
    // Create a new user with no wallet history
    const { getDb } = await import('../db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO users (id, name, email) VALUES (?, ?, ?)`,
      args: ['user-no-wallet', 'No Wallet', 'nowallet@test.com'],
    });
    const summary = await getUserSpendingSummary('user-no-wallet');
    expect(summary.totalSpent).toBe(0);
    expect(summary.transactionCount).toBe(0);
    expect(summary.issuesSupported).toBe(0);
  });
});
