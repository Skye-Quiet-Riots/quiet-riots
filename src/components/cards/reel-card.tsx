'use client';

import { useState } from 'react';
import type { RiotReel } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  curated: 'Curated',
  community: 'Community',
  ai_suggested: 'AI Pick',
};

interface ReelCardProps {
  reel: RiotReel;
}

export function ReelCard({ reel }: ReelCardProps) {
  const [upvotes, setUpvotes] = useState(reel.upvotes);
  const [voted, setVoted] = useState(false);

  async function handleVote() {
    if (voted) return;
    setVoted(true);
    setUpvotes(upvotes + 1);

    await fetch(`/api/issues/${reel.issue_id}/reels/${reel.id}/vote`, {
      method: 'POST',
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      {/* Thumbnail */}
      <a
        href={reel.youtube_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-t-lg"
      >
        <img
          src={reel.thumbnail_url}
          alt={reel.title}
          className="aspect-video w-full object-cover transition-opacity hover:opacity-90"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
            ▶
          </div>
        </div>
      </a>

      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-semibold leading-snug">{reel.title}</h4>
        {reel.caption && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            &ldquo;{reel.caption}&rdquo;
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={handleVote}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              voted
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-zinc-100 text-zinc-500 hover:bg-amber-50 hover:text-amber-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400'
            }`}
          >
            {voted ? '😂' : '🙂'} {upvotes}
          </button>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            {SOURCE_LABELS[reel.source] || reel.source}
          </span>
        </div>
      </div>
    </div>
  );
}
