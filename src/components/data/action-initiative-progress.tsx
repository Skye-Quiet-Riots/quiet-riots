import { getTranslations } from 'next-intl/server';
import type { ActionInitiative } from '@/types';
import { formatCurrency } from '@/lib/format';

interface ActionInitiativeProgressProps {
  actionInitiatives: ActionInitiative[];
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 60) return 'bg-blue-500';
  return 'bg-amber-500';
}

function getStatusBadgeClassName(status: string): string | null {
  if (status === 'goal_reached') {
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  }
  if (status === 'delivered') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  }
  return null;
}

export async function ActionInitiativeProgress({
  actionInitiatives,
}: ActionInitiativeProgressProps) {
  if (actionInitiatives.length === 0) return null;

  const t = await getTranslations('CampaignProgress');

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {t('title')}
      </h3>

      <div className="space-y-4">
        {actionInitiatives.map((ai) => {
          const pct = Math.min(
            100,
            Math.round((ai.committed_pence / ai.target_pence) * 100),
          );
          const badgeClassName = getStatusBadgeClassName(ai.status);
          const badgeLabel =
            ai.status === 'goal_reached'
              ? t('funded')
              : ai.status === 'delivered'
                ? t('disbursed')
                : null;

          return (
            <div key={ai.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{ai.title}</span>
                {badgeClassName && badgeLabel && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClassName}`}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>

              {ai.description && (
                <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {ai.description}
                </p>
              )}

              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {formatCurrency(ai.committed_pence, ai.currency_code)} of{' '}
                  {formatCurrency(ai.target_pence, ai.currency_code)} ({pct}
                  %)
                </span>
                <span>
                  {ai.supporter_count} {t('backers', { count: ai.supporter_count })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
