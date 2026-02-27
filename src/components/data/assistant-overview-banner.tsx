import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AssistantWithStats } from '@/lib/queries/assistants';

interface AssistantOverviewBannerProps {
  assistants: AssistantWithStats[];
}

export async function AssistantOverviewBanner({ assistants }: AssistantOverviewBannerProps) {
  const t = await getTranslations('Assistants');
  // Show up to 6 assistant icons as a visual preview
  const preview = assistants.slice(0, 6);

  return (
    <Link
      href="/assistants"
      className="group flex items-center gap-4 rounded-lg border border-purple-100 bg-purple-50/60 px-4 py-3 transition-all hover:border-purple-200 hover:bg-purple-50 dark:border-purple-900/40 dark:bg-purple-950/20 dark:hover:border-purple-800 dark:hover:bg-purple-950/30"
    >
      {/* Overlapping assistant icons */}
      <div className="flex -space-x-1.5 flex-shrink-0">
        {preview.map((a) => (
          <span
            key={a.id}
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs ring-2 ring-white dark:ring-zinc-900"
            style={{
              background: `linear-gradient(135deg, ${a.agent_gradient_start}, ${a.agent_gradient_end})`,
            }}
            aria-hidden="true"
          >
            {a.agent_icon}
          </span>
        ))}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
          {t('bannerTitle', { count: assistants.length })}
        </p>
        <p className="line-clamp-1 text-xs text-purple-700/80 dark:text-purple-300/70">
          {t('bannerSubtitle')}
        </p>
      </div>

      {/* CTA */}
      <span className="flex-shrink-0 text-xs font-medium text-purple-600 group-hover:text-purple-800 dark:text-purple-400 dark:group-hover:text-purple-300">
        {t('meetThem')}
      </span>
    </Link>
  );
}
