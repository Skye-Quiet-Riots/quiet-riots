import Link from 'next/link';
import { CategoryBadge } from '@/components/data/category-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import type { Issue } from '@/types';

interface IssueCardProps {
  issue: Issue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {issue.name}
        </h3>
        <TrendingIndicator delta={issue.trending_delta} />
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
        {issue.description}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <CategoryBadge category={issue.category} />
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold">{issue.rioter_count.toLocaleString()} rioters</span>
          <span>
            {issue.country_count} {issue.country_count === 1 ? 'country' : 'countries'}
          </span>
        </div>
      </div>
    </Link>
  );
}
