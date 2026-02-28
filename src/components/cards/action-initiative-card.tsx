import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatCurrency } from '@/lib/format';
import { CategoryBadge } from '@/components/data/category-badge';
import type { ActionInitiative, Category } from '@/types';

interface ActionInitiativeCardProps {
  actionInitiative: ActionInitiative;
  issueName?: string;
  issueCategory?: Category;
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

export async function ActionInitiativeCard({
  actionInitiative,
  issueName,
  issueCategory,
}: ActionInitiativeCardProps) {
  const t = await getTranslations('Cards');
  const tc = await getTranslations('Categories');
  const pct = Math.min(
    100,
    Math.round((actionInitiative.committed_pence / actionInitiative.target_pence) * 100),
  );
  const badgeClassName = getStatusBadgeClassName(actionInitiative.status);
  const badgeLabel =
    actionInitiative.status === 'goal_reached'
      ? t('funded')
      : actionInitiative.status === 'delivered'
        ? t('disbursed')
        : null;

  return (
    <Link
      href={`/action-initiatives/${actionInitiative.id}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {actionInitiative.title}
        </h3>
        {badgeClassName && badgeLabel && (
          <span
            className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClassName}`}
          >
            {badgeLabel}
          </span>
        )}
      </div>

      {issueName && (
        <div className="mb-2 flex items-center gap-1.5">
          {issueCategory && (
            <CategoryBadge category={issueCategory} label={tc(issueCategory)} size="sm" />
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{issueName}</span>
        </div>
      )}

      <div className="mb-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {formatCurrency(actionInitiative.committed_pence, actionInitiative.currency_code)} of{' '}
          {formatCurrency(actionInitiative.target_pence, actionInitiative.currency_code)} ({pct}%)
        </span>
        <span>
          {actionInitiative.supporter_count}{' '}
          {t('backers', { count: actionInitiative.supporter_count })}
        </span>
      </div>
    </Link>
  );
}
