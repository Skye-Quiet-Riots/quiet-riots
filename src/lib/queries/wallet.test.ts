import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getWalletByUserId,
  getOrCreateWallet,
  getWalletTransactions,
  createTopupTransaction,
  completeTopup,
  createPayment,
  getUserSpendingSummary,
  getExchangeRate,
  upsertExchangeRate,
  getAllExchangeRates,
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
    expect(transaction.completed_at).toBeNull();
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

  it('throws for non-existent transaction', async () => {
    await expect(completeTopup('nonexistent-tx-id')).rejects.toThrow('Transaction not found');
  });

  it('is idempotent — double-completing a topup credits wallet only once', async () => {
    const { transaction } = await createTopupTransaction('wallet-sarah', 200);
    const walletBefore = await getWalletByUserId('user-sarah');
    const balanceBefore = walletBefore!.balance_pence;

    await completeTopup(transaction.id, 'sim-1');
    await completeTopup(transaction.id, 'sim-2'); // Should be a no-op

    const walletAfter = await getWalletByUserId('user-sarah');
    expect(walletAfter!.balance_pence).toBe(balanceBefore + 200); // Only credited once
  });
});

describe('createPayment', () => {
  it('deducts from wallet and credits action initiative', async () => {
    // First top up to ensure sufficient funds
    const { transaction: topupTx } = await createTopupTransaction('wallet-sarah', 2000);
    await completeTopup(topupTx.id);

    const walletBefore = await getWalletByUserId('user-sarah');
    const balanceBefore = walletBefore!.balance_pence;

    const result = await createPayment('user-sarah', 'camp-water-test', 100);
    expect(result.transaction.type).toBe('payment');
    expect(result.transaction.amount_pence).toBe(100);
    expect(result.transaction.action_initiative_id).toBe('camp-water-test');
    expect(result.transaction.completed_at).not.toBeNull();
    expect(result.actionInitiative.committed_pence).toBeGreaterThan(31000);

    const walletAfter = await getWalletByUserId('user-sarah');
    expect(walletAfter!.balance_pence).toBe(balanceBefore - 100);
  });

  it('throws error for insufficient funds', async () => {
    await expect(createPayment('user-sarah', 'camp-water-test', 999999)).rejects.toThrow(
      'Insufficient funds',
    );
  });

  it('throws error for non-existent action initiative', async () => {
    await expect(createPayment('user-sarah', 'camp-nonexistent', 100)).rejects.toThrow(
      'Action initiative not found',
    );
  });

  it('throws error for goal-reached action initiative', async () => {
    await expect(createPayment('user-sarah', 'camp-funded', 100)).rejects.toThrow(
      'Action initiative is not active',
    );
  });

  it('marks action initiative as goal_reached when target is reached', async () => {
    // camp-almost-funded has target 10000, committed 9950 — needs 50 more
    const result = await createPayment('user-sarah', 'camp-almost-funded', 50);
    expect(result.actionInitiative.status).toBe('goal_reached');
  });
});

describe('getOrCreateWallet — invalid user', () => {
  it('throws error for non-existent user ID', async () => {
    await expect(getOrCreateWallet('user-does-not-exist')).rejects.toThrow('User not found');
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
    const { getDb } = await import('../db');
    const db = getDb();
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)`,
      args: ['user-no-wallet', 'No Wallet', 'nowallet@test.com'],
    });
    const summary = await getUserSpendingSummary('user-no-wallet');
    expect(summary.totalSpent).toBe(0);
    expect(summary.transactionCount).toBe(0);
    expect(summary.issuesSupported).toBe(0);
  });
});

describe('exchange rates', () => {
  it('returns null for non-existent exchange rate', async () => {
    const rate = await getExchangeRate('GBP', 'XYZ');
    expect(rate).toBeNull();
  });

  it('returns 1 for same-currency exchange', async () => {
    const rate = await getExchangeRate('GBP', 'GBP');
    expect(rate).toBe(1);
  });

  it('upserts and retrieves exchange rate', async () => {
    await upsertExchangeRate('GBP', 'USD', 1.27);
    const rate = await getExchangeRate('GBP', 'USD');
    expect(rate).toBe(1.27);
  });

  it('updates existing exchange rate', async () => {
    await upsertExchangeRate('GBP', 'EUR', 1.15);
    await upsertExchangeRate('GBP', 'EUR', 1.18);
    const rate = await getExchangeRate('GBP', 'EUR');
    expect(rate).toBe(1.18);
  });

  it('lists all exchange rates', async () => {
    const rates = await getAllExchangeRates();
    expect(rates.length).toBeGreaterThanOrEqual(2);
    expect(rates[0].from_currency).toBeDefined();
    expect(rates[0].rate).toBeGreaterThan(0);
  });
});
