'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';

interface Transaction {
  id: string;
  type: string;
  amount_pence: number;
  description: string | null;
  completed_at: string | null;
  user_name?: string;
}

interface TreasuryDashboardProps {
  transactions: Transaction[];
  balance: number;
  stats: { total: number; byStatus: Record<string, number> };
}

export function TreasuryDashboard({ transactions, balance, stats }: TreasuryDashboardProps) {
  const t = useTranslations('Treasury');

  // Calculate totals from transactions
  const totalCollected = transactions
    .filter((tx) => tx.type === 'share_consideration' || tx.type === 'topup')
    .reduce((sum, tx) => sum + tx.amount_pence, 0);
  const totalRefunded = transactions
    .filter((tx) => tx.type === 'refund')
    .reduce((sum, tx) => sum + tx.amount_pence, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('balance')}
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('totalCollected')}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalCollected)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('totalRefunded')}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalRefunded)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('net')}
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Share stats */}
      {Object.keys(stats.byStatus).length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Applications by Status ({stats.total} total)
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/50"
              >
                <span className="text-zinc-500 dark:text-zinc-400">{status}: </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction log */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('transactions')}
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noTransactions')}</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">
                    {tx.type === 'refund' ? t('refund') : t('payment')}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tx.description}
                    {tx.user_name && ` · ${tx.user_name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      tx.type === 'refund'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {tx.type === 'refund' ? '-' : '+'}
                    {formatCurrency(tx.amount_pence)}
                  </p>
                  {tx.completed_at && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(tx.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
