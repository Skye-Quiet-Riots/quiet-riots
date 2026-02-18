'use client';

import { useState } from 'react';
import type { RiotReel } from '@/types';
import { ReelCard } from '@/components/cards/reel-card';

interface ReelsSectionProps {
  issueId: string;
  initialReels: RiotReel[];
}

export function ReelsSection({ issueId, initialReels }: ReelsSectionProps) {
  const [reels] = useState(initialReels);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/issues/${issueId}/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: url.trim(), caption: caption.trim() }),
      });
      if (res.ok) {
        setUrl('');
        setCaption('');
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Reel grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>

      {reels.length === 0 && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No reels yet. Be the first to submit one!
        </p>
      )}

      {/* Submit form */}
      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="mb-3 text-sm font-medium">Got a funny video that sums up this issue?</p>
        {submitted ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            Thanks! Your reel has been submitted for review.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube URL..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)..."
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
