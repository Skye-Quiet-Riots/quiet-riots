'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ActivityItem } from '@/types';
import { ActivityCard } from '@/components/cards/activity-card';
import { Link } from '@/i18n/navigation';

const MAX_PAGES = 5;

interface PersonalFeedProps {
  initialActivities: ActivityItem[];
  initialCursor: string | null;
}

export function PersonalFeed({ initialActivities, initialCursor }: PersonalFeedProps) {
  const t = useTranslations('PersonalFeed');
  const locale = useLocale();
  const [activities, setActivities] = useState(initialActivities);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || pageCount >= MAX_PAGES) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor });
      if (locale !== 'en') params.set('locale', locale);

      const res = await fetch(`/api/users/me/feed?${params}`);
      if (!res.ok) return;

      const json = await res.json();
      if (json.ok && json.data) {
        setActivities((prev) => [...prev, ...json.data.activities]);
        setCursor(json.data.next_cursor);
        setPageCount((p) => p + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, locale, pageCount]);

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-blue-50/50 to-white p-8 text-center dark:border-zinc-700 dark:from-blue-950/20 dark:to-zinc-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/30">
          📭
        </div>
        <h3 className="mb-1 text-lg font-semibold">{t('emptyTitle')}</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{t('emptyDesc')}</p>
        <Link
          href="/issues"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {t('browseIssues')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityCard key={`${activity.activity_type}-${activity.activity_id}`} activity={activity} />
      ))}

      {/* Load more / max pages */}
      {cursor && pageCount < MAX_PAGES && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {loading ? t('loading') : t('loadMore')}
        </button>
      )}
    </div>
  );
}
