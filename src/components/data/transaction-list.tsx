import { formatPence } from '@/lib/format';
import type { WalletTransaction } from '@/types';

interface TransactionListProps {
  transactions: WalletTransaction[];
}

function getTypeDisplay(type: string): { emoji: string; label: string; colorClass: string } {
  switch (type) {
    case 'topup':
      return { emoji: '💰', label: 'Top-up', colorClass: 'text-green-600 dark:text-green-400' };
    case 'contribute':
      return {
        emoji: '🎯',
        label: 'Contribution',
        colorClass: 'text-red-600 dark:text-red-400',
      };
    case 'refund':
      return { emoji: '↩️', label: 'Refund', colorClass: 'text-green-600 dark:text-green-400' };
    default:
      return { emoji: '📝', label: type, colorClass: 'text-zinc-600' };
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No transactions yet. Top up your wallet to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="border-b border-zinc-100 px-5 py-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Recent Transactions
      </h3>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {transactions.map((tx) => {
          const display = getTypeDisplay(tx.type);
          const sign = tx.type === 'contribute' ? '-' : '+';

          return (
            <div key={tx.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{display.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{tx.description || display.label}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {timeAgo(tx.created_at)}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${display.colorClass}`}>
                {sign}
                {formatPence(tx.amount_pence)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
