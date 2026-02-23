import type { AssistantActivity } from '@/types';

interface Props {
  activities: AssistantActivity[];
}

export function AssistantActivityList({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
        No activity yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
        >
          <span
            className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
              activity.assistant_type === 'agent'
                ? 'bg-purple-500'
                : 'bg-blue-500'
            }`}
          >
            {activity.assistant_type === 'agent' ? 'AI' : 'H'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {activity.description}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              {activity.stat_value != null && activity.stat_label && (
                <span className="font-medium">
                  {activity.stat_value} {activity.stat_label}
                </span>
              )}
              <time>
                {new Date(activity.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </time>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
