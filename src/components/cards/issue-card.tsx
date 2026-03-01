import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CategoryBadge } from '@/components/data/category-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import type { Issue } from '@/types';
import { CATEGORY_EMOJIS } from '@/types';

interface IssueCardProps {
  issue: Issue;
}

export async function IssueCard({ issue }: IssueCardProps) {
  const t = await getTranslations('Cards');
  const tc = await getTranslations('Categories');

  return (
    <Link
      href={`/issues/${issue.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      {/* Thumbnail or category emoji fallback */}
      <div className="relative h-32 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {issue.hero_thumb_url ? (
          <Image
            src={issue.hero_thumb_url}
            alt={issue.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
            {CATEGORY_EMOJIS[issue.category]}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {issue.name}
          </h3>
          <TrendingIndicator delta={issue.trending_delta} />
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
          {issue.description}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <CategoryBadge category={issue.category} label={tc(issue.category)} />
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold">
              {issue.rioter_count.toLocaleString()} {t('rioters')}
            </span>
            <span>
              {issue.country_count} {t('country', { count: issue.country_count })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
