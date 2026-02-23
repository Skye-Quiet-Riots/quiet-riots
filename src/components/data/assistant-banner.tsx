import Link from 'next/link';
import type { AssistantWithStats } from '@/lib/queries/assistants';
import type { Category } from '@/types';

interface AssistantBannerProps {
  assistant: AssistantWithStats;
}

export function AssistantBanner({ assistant }: AssistantBannerProps) {
  const category = (assistant.category.charAt(0).toUpperCase() +
    assistant.category.slice(1)) as Category;

  return (
    <Link
      href={`/assistants/${assistant.category.toLowerCase()}`}
      className="group flex items-center gap-3 rounded-lg border border-purple-100 bg-purple-50/60 px-4 py-3 transition-all hover:border-purple-200 hover:bg-purple-50 dark:border-purple-900/40 dark:bg-purple-950/20 dark:hover:border-purple-800 dark:hover:bg-purple-950/30"
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
        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
          {assistant.agent_name} & {assistant.human_name}
          <span className="ml-1.5 text-xs font-normal text-purple-600 dark:text-purple-400">
            Your {category} Assistants
          </span>
        </p>
        {assistant.goal && (
          <p className="line-clamp-1 text-xs text-purple-700/80 dark:text-purple-300/70">
            {assistant.goal}
          </p>
        )}
      </div>

      {/* CTA */}
      <span className="flex-shrink-0 text-xs font-medium text-purple-600 group-hover:text-purple-800 dark:text-purple-400 dark:group-hover:text-purple-300">
        Meet them →
      </span>
    </Link>
  );
}
