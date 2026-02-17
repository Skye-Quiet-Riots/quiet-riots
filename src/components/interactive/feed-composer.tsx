'use client';

import { useState } from 'react';
import type { FeedPost } from '@/types';

interface FeedComposerProps {
  issueId: string;
  onPost?: (post: FeedPost) => void;
}

export function FeedComposer({ issueId, onPost }: FeedComposerProps) {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/issues/${issueId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const post = await res.json();
        setContent('');
        onPost?.(post);
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts..."
        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
      />
      <button
        type="submit"
        disabled={posting || !content.trim()}
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        Post
      </button>
    </form>
  );
}
