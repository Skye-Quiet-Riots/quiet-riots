import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CategoryBadge } from '@/components/data/category-badge';
import type { Organisation } from '@/types';

interface OrgCardProps {
  org: Organisation;
  issueCount?: number;
  totalRioters?: number;
}

export async function OrgCard({ org, issueCount, totalRioters }: OrgCardProps) {
  const t = await getTranslations('Cards');
  const tc = await getTranslations('Categories');

  return (
    <Link
      href={`/organisations/${org.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      {/* Thumbnail or logo emoji fallback */}
      <div className="relative h-32 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {org.hero_thumb_url ? (
          <Image
            src={org.hero_thumb_url}
            alt={org.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
            {org.logo_emoji}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {org.name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <CategoryBadge category={org.category} label={tc(org.category)} showEmoji={false} />
          {issueCount !== undefined && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {issueCount} {t('issues')}
            </span>
          )}
          {totalRioters !== undefined && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              &middot; {totalRioters.toLocaleString()} {t('rioters')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
