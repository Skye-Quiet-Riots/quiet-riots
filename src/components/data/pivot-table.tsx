'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { IssuePivotRow, OrgPivotRow } from '@/types';

interface IssuePivotProps {
  mode: 'issue';
  rows: IssuePivotRow[];
  currentOrgId?: string;
  issueId?: string;
}

interface OrgPivotProps {
  mode: 'org';
  rows: OrgPivotRow[];
  currentIssueId?: string;
}

type PivotTableProps = IssuePivotProps | OrgPivotProps;

export function PivotTable(props: PivotTableProps) {
  const t = useTranslations('Pivot');

  if (props.mode === 'issue') {
    return (
      <div className="space-y-2">
        {props.rows.map((row) => {
          const isCurrent = row.organisation_id === props.currentOrgId;
          // Link to intersection page if issueId is provided, else fall back to org detail
          const href = props.issueId
            ? `/issues/${props.issueId}/organisations/${row.organisation_id}`
            : `/organisations/${row.organisation_id}`;
          return (
            <Link
              key={row.organisation_id}
              href={href}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                isCurrent
                  ? 'border-blue-300 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/30'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className="text-xl">{row.logo_emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{row.organisation_name}</span>
                  {isCurrent && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {t('you')}
                    </span>
                  )}
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {row.rioter_count.toLocaleString()} {t('rioters')}
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-400">#{row.rank}</span>
              {/* Chevron indicating drill-down to intersection page */}
              {props.issueId && (
                <span className="text-zinc-400 dark:text-zinc-500" aria-hidden="true">
                  →
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  // Org pivot mode — show local position (Pareto-ranked by rioter count)
  return (
    <div className="space-y-2">
      {props.rows.map((row, index) => {
        const isCurrent = row.issue_id === props.currentIssueId;
        return (
          <Link
            key={row.issue_id}
            href={`/issues/${row.issue_id}`}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
              isCurrent
                ? 'border-blue-300 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/30'
                : 'border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{row.issue_name}</span>
                {isCurrent && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {t('you')}
                  </span>
                )}
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {row.rioter_count.toLocaleString()} {t('rioters')}
              </span>
            </div>
            <span className="text-sm font-medium text-zinc-400">#{index + 1}</span>
          </Link>
        );
      })}
    </div>
  );
}
