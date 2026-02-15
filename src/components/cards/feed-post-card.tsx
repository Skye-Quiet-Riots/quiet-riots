'use client';

import { useState } from 'react';
import type { FeedPost } from '@/types';

interface FeedPostCardProps {
  post: FeedPost;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setLikes(likes + 1);

    await fetch(`/api/issues/${post.issue_id}/feed/${post.id}/like`, {
      method: 'POST',
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-sm">{post.user_name || 'Anonymous'}</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(post.created_at)}</span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{post.content}</p>
      <div className="mt-3 flex items-center gap-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            liked
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
          }`}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>
      </div>
    </div>
  );
}
