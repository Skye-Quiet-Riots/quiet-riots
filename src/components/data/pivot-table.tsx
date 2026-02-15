import Link from 'next/link';
import type { IssuePivotRow, OrgPivotRow } from '@/types';

interface IssuePivotProps {
  mode: 'issue';
  rows: IssuePivotRow[];
  currentOrgId?: number;
}

interface OrgPivotProps {
  mode: 'org';
  rows: OrgPivotRow[];
  currentIssueId?: number;
}

type PivotTableProps = IssuePivotProps | OrgPivotProps;

export function PivotTable(props: PivotTableProps) {
  if (props.mode === 'issue') {
    return (
      <div className="space-y-2">
        {props.rows.map((row) => {
          const isCurrent = row.organisation_id === props.currentOrgId;
          return (
            <Link
              key={row.organisation_id}
              href={`/organisations/${row.organisation_id}`}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                isCurrent
                  ? 'border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-900/20'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className="text-xl">{row.logo_emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{row.organisation_name}</span>
                  {isCurrent && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {row.rioter_count.toLocaleString()} rioters
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-400">#{row.rank}</span>
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
                ? 'border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-900/20'
                : 'border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{row.issue_name}</span>
                {isCurrent && (
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {row.rioter_count.toLocaleString()} rioters
              </span>
            </div>
            <span className="text-sm font-medium text-zinc-400">#{index + 1}</span>
          </Link>
        );
      })}
    </div>
  );
}
