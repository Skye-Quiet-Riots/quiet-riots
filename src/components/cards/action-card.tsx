import { getTranslations } from 'next-intl/server';
import type { Action } from '@/types';

interface ActionCardProps {
  action: Action;
}

const TYPE_COLORS = {
  idea: 'border-amber-300 dark:border-amber-700',
  action: 'border-blue-300 dark:border-blue-700',
  together: 'border-green-300 dark:border-green-700',
};

const TYPE_EMOJIS = {
  idea: '💡',
  action: '⚡',
  together: '🤝',
};

const TIME_LABEL_KEYS: Record<string, 'time1min' | 'time10min' | 'time1hour'> = {
  '1min': 'time1min',
  '10min': 'time10min',
  '1hr+': 'time1hour',
};

export async function ActionCard({ action }: ActionCardProps) {
  const t = await getTranslations('Cards');

  const color = TYPE_COLORS[action.type];
  const emoji = TYPE_EMOJIS[action.type];
  const timeLabelKey = TIME_LABEL_KEYS[action.time_required];

  return (
    <div
      className={`rounded-lg border-l-4 ${color} border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{emoji}</span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold">{action.title}</h4>
            <span className="flex-shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {timeLabelKey ? t(timeLabelKey) : action.time_required}
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
                {t('skills')}
                {action.skills_needed}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
