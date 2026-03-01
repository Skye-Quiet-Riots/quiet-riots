'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { OrgPivotRow } from '@/types';

interface IssueListProps {
  rows: OrgPivotRow[];
}

export function IssueList({ rows }: IssueListProps) {
  const t = useTranslations('Pivot');

  if (rows.length === 0) return null;

  const maxCount = Math.max(...rows.map((r) => r.rioter_count), 1);

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-5 dark:border-blue-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
        {t('issues')}
      </h3>
      <div className="space-y-3">
        {rows.map((row) => {
          const barWidth = Math.max((row.rioter_count / maxCount) * 100, 4);
          return (
            <Link
              key={row.issue_id}
              href={`/issues/${row.issue_id}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                {row.issue_name}
              </span>
              <span className="min-w-[3rem] text-right text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
                {row.rioter_count.toLocaleString()}
              </span>
              <div className="w-16 sm:w-20">
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
