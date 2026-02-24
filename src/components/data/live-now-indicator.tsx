'use client';

import type { Evidence } from '@/types';

interface LiveNowIndicatorProps {
  liveEvidence: Evidence[];
}

export function LiveNowIndicator({ liveEvidence }: LiveNowIndicatorProps) {
  if (liveEvidence.length === 0) return null;

  const latestLive = liveEvidence[0];

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/10">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">
          {latestLive.user_name || 'Someone'} is going live now
        </span>
        {/* Typing dots animation */}
        <span className="flex gap-0.5">
          <span
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
            style={{ animationDelay: '300ms' }}
          />
        </span>
      </div>
      {liveEvidence.length > 1 && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          +{liveEvidence.length - 1} more live now
        </p>
      )}
    </div>
  );
}
