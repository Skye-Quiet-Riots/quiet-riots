import type { ExpertProfile } from '@/types';

interface ExpertCardProps {
  expert: ExpertProfile;
}

export function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
        {expert.avatar_emoji}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{expert.name}</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {expert.role}
          </span>
        </div>
        {expert.speciality && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{expert.speciality}</p>
        )}
        {expert.achievement && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{expert.achievement}</p>
        )}
      </div>
    </div>
  );
}
