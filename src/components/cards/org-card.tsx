import Link from 'next/link';
import { CategoryBadge } from '@/components/data/category-badge';
import type { Organisation } from '@/types';

interface OrgCardProps {
  org: Organisation;
  issueCount?: number;
  totalRioters?: number;
}

export function OrgCard({ org, issueCount, totalRioters }: OrgCardProps) {
  return (
    <Link
      href={`/organisations/${org.id}`}
      className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        {org.logo_emoji}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {org.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <CategoryBadge category={org.category} showEmoji={false} />
          {issueCount !== undefined && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{issueCount} issues</span>
          )}
          {totalRioters !== undefined && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              &middot; {totalRioters.toLocaleString()} rioters
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
