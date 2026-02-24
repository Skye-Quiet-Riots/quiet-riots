import Link from 'next/link';
import type { CategoryAssistant, Category } from '@/types';

interface AssistantDetailBannerProps {
  assistant: CategoryAssistant;
  agentHelps?: string | null;
  humanHelps?: string | null;
  focus?: string | null;
}

export function AssistantDetailBanner({
  assistant,
  agentHelps,
  humanHelps,
  focus,
}: AssistantDetailBannerProps) {
  const category = (assistant.category.charAt(0).toUpperCase() +
    assistant.category.slice(1)) as Category;
  const effectiveFocus = focus ?? assistant.focus;

  return (
    <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 p-4 dark:border-purple-900/40 dark:from-purple-950/20 dark:to-indigo-950/20 sm:p-5">
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
          <h3 className="font-semibold text-purple-900 dark:text-purple-200">
            Your {category} Assistants
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-400">
            {assistant.agent_name}{' '}
            <span className="text-purple-500 dark:text-purple-500">(AI Agent)</span> &{' '}
            {assistant.human_name}{' '}
            <span className="text-purple-500 dark:text-purple-500">(Human Organiser)</span>
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
          📌 Current focus: {effectiveFocus}
        </p>
      )}

      {/* Per-issue help text (only on issue detail pages) */}
      {(agentHelps || humanHelps) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {agentHelps && (
            <div className="rounded-lg bg-white/60 p-3 dark:bg-zinc-900/40">
              <p className="mb-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
                {assistant.agent_icon} {assistant.agent_name} helps with
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{agentHelps}</p>
            </div>
          )}
          {humanHelps && (
            <div className="rounded-lg bg-white/60 p-3 dark:bg-zinc-900/40">
              <p className="mb-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                {assistant.human_icon} {assistant.human_name} helps with
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
          className="text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
        >
          Learn more about {assistant.agent_name} & {assistant.human_name} →
        </Link>
      </div>
    </div>
  );
}
