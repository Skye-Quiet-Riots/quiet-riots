import type { Action } from '@/types';

const TYPE_CONFIG = {
  idea: { emoji: '💡', label: 'Idea', color: 'border-amber-300 dark:border-amber-700' },
  action: { emoji: '⚡', label: 'Action', color: 'border-blue-300 dark:border-blue-700' },
  together: { emoji: '🤝', label: 'Together', color: 'border-green-300 dark:border-green-700' },
};

const TIME_LABELS: Record<string, string> = {
  '1min': '1 min',
  '10min': '10 min',
  '1hr+': '1 hour+',
};

interface ActionCardProps {
  action: Action;
}

export function ActionCard({ action }: ActionCardProps) {
  const config = TYPE_CONFIG[action.type];

  return (
    <div className={`rounded-lg border-l-4 ${config.color} border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{config.emoji}</span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold">{action.title}</h4>
            <span className="flex-shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {TIME_LABELS[action.time_required] || action.time_required}
            </span>
          </div>
          {action.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{action.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {action.provider_name && action.external_url && (
              <a
                href={action.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                {action.provider_name} ↗
              </a>
            )}
            {action.skills_needed && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Skills: {action.skills_needed}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
