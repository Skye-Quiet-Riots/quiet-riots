import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AssistantWithStats } from '@/lib/queries/assistants';

interface AssistantBannerProps {
  assistant: AssistantWithStats;
}

export async function AssistantBanner({ assistant }: AssistantBannerProps) {
  const t = await getTranslations('Assistants');
  const tc = await getTranslations('Categories');
  const categoryLabel = tc(assistant.category.charAt(0).toUpperCase() + assistant.category.slice(1));

  return (
    <Link
      href={`/assistants/${assistant.category.toLowerCase()}`}
      className="group flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
    >
      {/* Dual overlapping gradient icons */}
      <div className="flex -space-x-2 flex-shrink-0">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm ring-2 ring-white dark:ring-zinc-900"
          style={{
            background: `linear-gradient(135deg, ${assistant.agent_gradient_start}, ${assistant.agent_gradient_end})`,
          }}
          aria-hidden="true"
        >
          {assistant.agent_icon}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm ring-2 ring-white dark:ring-zinc-900"
          style={{
            background: `linear-gradient(135deg, ${assistant.human_gradient_start}, ${assistant.human_gradient_end})`,
          }}
          aria-hidden="true"
        >
          {assistant.human_icon}
        </span>
      </div>

      {/* Names + goal */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          {assistant.agent_name} & {assistant.human_name}
          <span className="ml-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">
            {t('yourAssistants', { category: categoryLabel })}
          </span>
        </p>
        {assistant.goal && (
          <p className="line-clamp-1 text-xs text-blue-700/80 dark:text-blue-300/70">
            {assistant.goal}
          </p>
        )}
      </div>

      {/* CTA */}
      <span className="flex-shrink-0 text-xs font-medium text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
        {t('meetThem')}
      </span>
    </Link>
  );
}
