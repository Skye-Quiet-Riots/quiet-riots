'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { FeedPost, FeedComment } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';

interface FeedPostCardProps {
  post: FeedPost;
}

/** Deterministic background color for avatar initials */
function avatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-red-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Parse photo_urls defensively — always returns an array of HTTPS URLs */
function parsePhotoUrls(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((url: unknown) => typeof url === 'string' && url.startsWith('https://'));
  } catch {
    return [];
  }
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const t = useTranslations('Feed');
  const locale = useLocale();
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [shares, setShares] = useState(post.shares ?? 0);
  const [shared, setShared] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const userName = post.user_name || t('anonymousUser');
  const photos = parsePhotoUrls(post.photo_urls);
  const commentsCount = post.comments_count ?? 0;
  const [displayCommentsCount, setDisplayCommentsCount] = useState(commentsCount);

  const commentsId = `comments-${post.id}`;

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setLikes(likes + 1);
    await fetch(`/api/issues/${post.issue_id}/feed/${post.id}/like`, { method: 'POST' });
  }

  async function handleShare() {
    const url = `${window.location.origin}/${locale}/issues/${post.issue_id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API not available
    }
    if (!shared) {
      setShared(true);
      setShares(shares + 1);
      await fetch(`/api/issues/${post.issue_id}/feed/${post.id}/share`, { method: 'POST' });
      trackEvent('feed_post_shared', { postId: post.id, issueId: post.issue_id });
    }
  }

  async function toggleComments() {
    const newOpen = !commentsOpen;
    setCommentsOpen(newOpen);
    if (newOpen && !commentsLoaded) {
      const res = await fetch(
        `/api/issues/${post.issue_id}/feed/${post.id}/comments`,
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.data ?? data);
        setCommentsLoaded(true);
      }
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(
        `/api/issues/${post.issue_id}/feed/${post.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: commentText.trim() }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const newComment = data.data ?? data;
        setComments((prev) => [...prev, newComment]);
        setCommentText('');
        setDisplayCommentsCount((c) => c + 1);
        trackEvent('feed_comment_added', { postId: post.id, issueId: post.issue_id });
      }
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header: avatar + name + country flag + time */}
      <div className="mb-3 flex items-center gap-3">
        {post.user_avatar ? (
          <img
            src={post.user_avatar}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(userName)}`}
          >
            {getInitials(userName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{userName}</span>
            {post.user_country_code && (
              <img
                src={`https://flagcdn.com/16x12/${post.user_country_code.toLowerCase()}.png`}
                alt={post.user_country_code}
                className="h-3 w-4"
              />
            )}
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatRelativeTime(post.created_at, locale)}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{post.content}</p>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-lg ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {photos.slice(0, 4).map((url, i) => (
            <img
              key={url}
              src={url}
              alt={t('photoAlt', { number: i + 1, user: userName })}
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-3 flex items-center gap-1">
        <button
          onClick={handleLike}
          className={`flex min-h-[44px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            liked
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
          }`}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>

        <button
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          aria-controls={commentsId}
          className="flex min-h-[44px] items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          💬 {t('commentCount', { count: displayCommentsCount })}
        </button>

        <button
          onClick={handleShare}
          className={`flex min-h-[44px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            shared
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              : 'bg-zinc-100 text-zinc-500 hover:bg-blue-50 hover:text-blue-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
          }`}
        >
          {shared ? t('shared') : t('share')}
        </button>
      </div>

      {/* Comments section */}
      {commentsOpen && (
        <div id={commentsId} role="region" aria-label={t('commentCount', { count: displayCommentsCount })} className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {comments.length === 0 && commentsLoaded && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('commentEmpty')}</p>
          )}
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.user_name || t('anonymousUser')}</span>{' '}
                <span className="text-zinc-600 dark:text-zinc-400">{c.content}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handlePostComment} className="mt-2 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('addComment')}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={postingComment || !commentText.trim()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {t('postComment')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
