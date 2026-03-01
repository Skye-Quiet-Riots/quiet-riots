'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ActivityItem } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import { Link } from '@/i18n/navigation';

interface ActivityCardProps {
  activity: ActivityItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const t = useTranslations('PersonalFeed');
  const locale = useLocale();

  const typeLabel =
    activity.activity_type === 'evidence'
      ? t('evidenceLabel')
      : activity.activity_type === 'riot_reel'
        ? t('reelLabel')
        : t('feedPostLabel');

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
        activity.activity_type === 'feed_post' ? 'border-s-3 border-s-blue-400 dark:border-s-blue-500' : ''
      }`}
      aria-label={`${typeLabel} — ${activity.issue_name} — ${formatRelativeTime(activity.created_at, locale)}`}
    >
      {/* Media thumbnail for evidence and riot reels */}
      {activity.media_url && activity.activity_type === 'riot_reel' && (
        <Link href={activity.detail_url} className="relative block overflow-hidden rounded-t-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- external thumbnail URL */}
          <img
            src={activity.media_url}
            alt={activity.content_snippet}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white text-sm">
              ▶
            </div>
          </div>
        </Link>
      )}

      {/* Evidence photo thumbnails */}
      {activity.media_url && activity.activity_type === 'evidence' && activity.media_type === 'image' && (
        <Link href={activity.detail_url} className="block overflow-hidden rounded-t-lg">
          <EvidenceThumbnails photoUrls={activity.media_url} alt={activity.content_snippet} />
        </Link>
      )}

      <div className="p-3">
        {/* Header: user name + time */}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {typeLabel}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="truncate text-sm font-semibold">{activity.user_name}</span>
          </div>
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {formatRelativeTime(activity.created_at, locale)}
          </span>
        </div>

        {/* Issue name link */}
        <Link
          href={activity.detail_url}
          className="mb-1 block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {activity.issue_name}
        </Link>

        {/* Content snippet */}
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {activity.content_snippet}
        </p>

        {/* Stats row */}
        {(activity.likes > 0 || activity.comments_count > 0) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            {activity.likes > 0 && (
              <span>{t('likesCount', { count: activity.likes })}</span>
            )}
            {activity.comments_count > 0 && (
              <span>{t('commentsCount', { count: activity.comments_count })}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Render up to 3 evidence photo thumbnails in a horizontal strip. */
function EvidenceThumbnails({ photoUrls, alt }: { photoUrls: string; alt: string }) {
  let urls: string[] = [];
  try {
    const parsed = JSON.parse(photoUrls);
    urls = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return null;
  }

  if (urls.length === 0) return null;

  return (
    <div className="flex gap-0.5 overflow-hidden">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- external blob URL
        <img
          key={i}
          src={url}
          alt={`${alt} ${i + 1}`}
          className="h-20 w-20 shrink-0 object-cover"
        />
      ))}
    </div>
  );
}
