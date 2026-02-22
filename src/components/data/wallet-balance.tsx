import { formatPence } from '@/lib/format';

interface WalletBalanceProps {
  balance_pence: number;
  total_loaded_pence: number;
  total_spent_pence: number;
  campaigns_supported: number;
}

export function WalletBalance({
  balance_pence,
  total_loaded_pence,
  total_spent_pence,
  campaigns_supported,
}: WalletBalanceProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Your Balance
      </h3>
      <p className="mb-4 text-3xl font-bold">{formatPence(balance_pence)}</p>

      <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="text-center">
          <span className="block text-sm font-bold">{formatPence(total_loaded_pence)}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">loaded</span>
        </div>
        <div className="text-center">
          <span className="block text-sm font-bold">{formatPence(total_spent_pence)}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">contributed</span>
        </div>
        <div className="text-center">
          <span className="block text-sm font-bold">{campaigns_supported}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {campaigns_supported === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>
      </div>
    </div>
  );
}
