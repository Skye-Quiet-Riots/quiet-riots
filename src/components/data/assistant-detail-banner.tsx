import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CategoryAssistant, Category } from '@/types';

interface AssistantDetailBannerProps {
  assistant: CategoryAssistant;
  agentHelps?: string | null;
  humanHelps?: string | null;
  focus?: string | null;
}

export async function AssistantDetailBanner({
  assistant,
  agentHelps,
  humanHelps,
  focus,
}: AssistantDetailBannerProps) {
  const t = await getTranslations('Assistants');
  const tc = await getTranslations('Categories');
  const category = (assistant.category.charAt(0).toUpperCase() +
    assistant.category.slice(1)) as Category;
  const categoryLabel = tc(category);
  const effectiveFocus = focus ?? assistant.focus;

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-sky-50/80 p-4 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-sky-950/20 sm:p-5">
      {/* Header: icons + names */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex -space-x-2 flex-shrink-0">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 ring-white dark:ring-zinc-900"
            style={{
              background: `linear-gradient(135deg, ${assistant.agent_gradient_start}, ${assistant.agent_gradient_end})`,
            }}
            aria-hidden="true"
          >
            {assistant.agent_icon}
          </span>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 ring-white dark:ring-zinc-900"
            style={{
              background: `linear-gradient(135deg, ${assistant.human_gradient_start}, ${assistant.human_gradient_end})`,
            }}
            aria-hidden="true"
          >
            {assistant.human_icon}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200">
            {t('yourAssistants', { category: categoryLabel })}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {assistant.agent_name}{' '}
            <span className="text-blue-500 dark:text-blue-500">{t('aiAgentLabel')}</span> &{' '}
            {assistant.human_name}{' '}
            <span className="text-blue-500 dark:text-blue-500">{t('humanOrganiserLabel')}</span>
          </p>
        </div>
      </div>

      {/* Goal */}
      {assistant.goal && (
        <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">{assistant.goal}</p>
      )}

      {/* Current focus */}
      {effectiveFocus && (
        <p className="mb-2 text-sm italic text-zinc-600 dark:text-zinc-400">
          📌 {t('currentFocus', { focus: effectiveFocus })}
        </p>
      )}

      {/* Per-issue help text (only on issue detail pages) */}
      {(agentHelps || humanHelps) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {agentHelps && (
            <div className="rounded-lg bg-white/60 p-3 dark:bg-zinc-900/40">
              <p className="mb-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                {assistant.agent_icon} {t('helpsWith', { name: assistant.agent_name })}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{agentHelps}</p>
            </div>
          )}
          {humanHelps && (
            <div className="rounded-lg bg-white/60 p-3 dark:bg-zinc-900/40">
              <p className="mb-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                {assistant.human_icon} {t('helpsWith', { name: assistant.human_name })}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{humanHelps}</p>
            </div>
          )}
        </div>
      )}

      {/* Link to full profile */}
      <div className="mt-3">
        <Link
          href={`/assistants/${assistant.category.toLowerCase()}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t('learnMore', { agentName: assistant.agent_name, humanName: assistant.human_name })}
        </Link>
      </div>
    </div>
  );
}
