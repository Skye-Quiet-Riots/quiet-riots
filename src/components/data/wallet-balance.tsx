import { getTranslations } from 'next-intl/server';
import { formatCurrency } from '@/lib/format';

interface WalletBalanceProps {
  balance_pence: number;
  total_loaded_pence: number;
  total_spent_pence: number;
  projects_supported: number;
  currency?: string;
}

export async function WalletBalance({
  balance_pence,
  total_loaded_pence,
  total_spent_pence,
  projects_supported,
  currency = 'GBP',
}: WalletBalanceProps) {
  const t = await getTranslations('WalletBalance');

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {t('title')}
      </h3>
      <p className="mb-4 text-3xl font-bold">{formatCurrency(balance_pence, currency)}</p>

      <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="text-center">
          <span className="block text-sm font-bold">
            {formatCurrency(total_loaded_pence, currency)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('loaded')}</span>
        </div>
        <div className="text-center">
          <span className="block text-sm font-bold">
            {formatCurrency(total_spent_pence, currency)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('spent')}</span>
        </div>
        <div className="text-center">
          <span className="block text-sm font-bold">{projects_supported}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('projects', { count: projects_supported })}
          </span>
        </div>
      </div>
    </div>
  );
}
