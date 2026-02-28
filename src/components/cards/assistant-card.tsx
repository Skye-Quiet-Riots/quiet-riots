import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CategoryBadge } from '@/components/data/category-badge';
import type { Category } from '@/types';
import type { AssistantWithStats } from '@/lib/queries/assistants';

interface AssistantCardProps {
  assistant: AssistantWithStats;
}

export async function AssistantCard({ assistant }: AssistantCardProps) {
  const t = await getTranslations('Cards');
  const tc = await getTranslations('Categories');
  const category = (assistant.category.charAt(0).toUpperCase() +
    assistant.category.slice(1)) as Category;

  return (
    <Link
      href={`/assistants/${assistant.category}`}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      {/* Names and icons */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex -space-x-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 ring-white dark:ring-zinc-900"
            style={{
              background: `linear-gradient(135deg, ${assistant.agent_gradient_start}, ${assistant.agent_gradient_end})`,
            }}
          >
            {assistant.agent_icon}
          </span>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 ring-white dark:ring-zinc-900"
            style={{
              background: `linear-gradient(135deg, ${assistant.human_gradient_start}, ${assistant.human_gradient_end})`,
            }}
          >
            {assistant.human_icon}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {assistant.agent_name} & {assistant.human_name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('aiAndHuman')}</p>
        </div>
      </div>

      {/* Goal */}
      {assistant.goal && (
        <p className="mb-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {assistant.goal}
        </p>
      )}

      {/* Stats + Category */}
      <div className="mt-auto flex items-center justify-between">
        <CategoryBadge category={category} label={tc(category)} />
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold">
            {assistant.rioter_count.toLocaleString()} {t('rioters')}
          </span>
          <span>
            {assistant.riot_count} {t('riots', { count: assistant.riot_count })}
          </span>
        </div>
      </div>
    </Link>
  );
}
