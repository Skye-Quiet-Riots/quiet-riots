'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import { AuthGate } from './auth-gate';

interface FollowButtonProps {
  issueId: string;
  initialFollowed: boolean;
}

export function FollowButton({ issueId, initialFollowed }: FollowButtonProps) {
  const t = useTranslations('Follow');
  const [followed, setFollowed] = useState(initialFollowed);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/follow`, {
        method: followed ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        const newState = !followed;
        setFollowed(newState);
        setStatusMessage(newState ? t('followConfirm') : t('unfollowConfirm'));
        trackEvent(newState ? 'issue_followed' : 'issue_unfollowed', { issueId });
        // Clear status message after 3s
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const body = await res.json();
        if (body.code === 'NOT_FOUND') {
          setStatusMessage(t('follow'));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate action="follow this Quiet Riot">
      <div>
        <button
          onClick={handleToggle}
          disabled={loading}
          aria-pressed={followed}
          aria-busy={loading}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            followed
              ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
              : 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white'
          }`}
        >
          {loading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : followed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
          {loading ? '...' : followed ? t('following') : t('follow')}
        </button>
        {statusMessage && (
          <p aria-live="polite" className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {statusMessage}
          </p>
        )}
      </div>
    </AuthGate>
  );
}
