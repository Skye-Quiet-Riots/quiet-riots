'use client';

import { useState } from 'react';
import type { Evidence, EvidenceComment } from '@/types';

interface EvidenceCardProps {
  evidence: Evidence;
  issueId: string;
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

function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Check if a URL points to a directly playable video file (e.g. Vercel Blob, S3) vs YouTube/external. */
function isDirectVideo(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Vercel Blob URLs are always direct files
    if (parsed.hostname.endsWith('.blob.vercel-storage.com')) return true;
    // Check for common video file extensions in the pathname
    return /\.(mp4|mov|webm)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** Infer MIME type from a video URL for the <source type> attribute. */
function videoMimeType(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.endsWith('.webm')) return 'video/webm';
    if (path.endsWith('.mov')) return 'video/quicktime';
  } catch {
    /* fall through */
  }
  return 'video/mp4'; // default — mp4 is the most common upload format
}

export function EvidenceCard({ evidence, issueId }: EvidenceCardProps) {
  const [likes, setLikes] = useState(evidence.likes);
  const [liked, setLiked] = useState(false);
  const [shares, setShares] = useState(evidence.shares);
  const [shared, setShared] = useState(false);
  const [commentsCount, setCommentsCount] = useState(evidence.comments_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<EvidenceComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const photoUrls = parseJsonArray(evidence.photo_urls);
  const externalUrls = parseJsonArray(evidence.external_urls);
  const isLive = evidence.live === 1;

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setLikes(likes + 1);
    await fetch(`/api/issues/${issueId}/evidence/${evidence.id}/like`, { method: 'POST' });
  }

  async function handleShare() {
    if (shared) return;
    setShared(true);
    setShares(shares + 1);
    await fetch(`/api/issues/${issueId}/evidence/${evidence.id}/share`, { method: 'POST' });
    // Copy link to clipboard
    const url = `${window.location.origin}/issues/${issueId}#evidence-${evidence.id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
  }

  async function toggleComments() {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      const res = await fetch(`/api/issues/${issueId}/evidence/${evidence.id}/comments`);
      const { data } = await res.json();
      setComments(data ?? []);
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    const res = await fetch(`/api/issues/${issueId}/evidence/${evidence.id}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setComments([...comments, data]);
      setCommentsCount(commentsCount + 1);
      setCommentText('');
    }
  }

  // Build the attribution line
  const attribution = evidence.org_name
    ? `gathered evidence about ${evidence.issue_name} on ${evidence.org_name}`
    : `gathered evidence about ${evidence.issue_name}`;

  return (
    <div
      id={`evidence-${evidence.id}`}
      className={`rounded-lg border bg-white p-4 dark:bg-zinc-900 ${
        isLive ? 'border-red-300 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'
      }`}
    >
      {/* Live badge */}
      {isLive && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">{evidence.user_name || 'Anonymous'}</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {timeAgo(evidence.created_at)}
        </span>
      </div>

      {/* Attribution */}
      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{attribution}</p>

      {/* Content */}
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{evidence.content}</p>

      {/* Photos */}
      {photoUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {photoUrls.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className="aspect-video overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Evidence photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {evidence.video_url && (
        <div className="mt-3">
          {isDirectVideo(evidence.video_url) ? (
            <video
              controls
              preload="metadata"
              playsInline
              crossOrigin="anonymous"
              className="max-h-96 max-w-md rounded-md bg-black"
            >
              <source
                src={`${evidence.video_url}#t=0.001`}
                type={videoMimeType(evidence.video_url)}
              />
              <track kind="captions" />
            </video>
          ) : (
            <a
              href={evidence.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <span>&#9654;</span> Watch video
            </a>
          )}
        </div>
      )}

      {/* External URLs */}
      {externalUrls.length > 0 && (
        <div className="mt-3 space-y-1">
          {externalUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {url}
            </a>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            liked
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
          }`}
        >
          {liked ? '\u2764\ufe0f' : '\u{1f90d}'} {likes}
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-blue-50 hover:text-blue-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
        >
          💬 {commentsCount}
        </button>

        <button
          onClick={handleShare}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            shared
              ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-green-900/20 dark:hover:text-green-400'
          }`}
        >
          {shared ? '✅' : '↗'} {shares}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {loadingComments && <p className="text-xs text-zinc-400">Loading comments...</p>}

          {comments.map((c) => (
            <div key={c.id} className="mb-2 last:mb-0">
              <p className="text-xs">
                <span className="font-semibold">{c.user_name}</span>{' '}
                <span className="text-zinc-500 dark:text-zinc-400">{c.content}</span>
              </p>
            </div>
          ))}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
