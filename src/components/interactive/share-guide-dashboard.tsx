'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ShareStatus } from '@/types';

interface Application {
  id: string;
  user_id: string;
  status: ShareStatus;
  user_name?: string;
  user_email?: string;
  created_at: string;
}

interface ShareGuideDashboardProps {
  initialApplications: Application[];
  currentUserId: string;
}

const TABS: ShareStatus[] = [
  'under_review',
  'approved',
  'identity_submitted',
  'issued',
  'rejected',
];

export function ShareGuideDashboard({
  initialApplications,
  currentUserId,
}: ShareGuideDashboardProps) {
  const t = useTranslations('ShareGuide');
  const [applications, setApplications] = useState(initialApplications);
  const [activeTab, setActiveTab] = useState<ShareStatus | 'all'>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered =
    activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab);

  async function handleReview(appId: string, decision: 'approve' | 'reject') {
    setLoading(true);
    setError('');

    try {
      const body: Record<string, string> = { decision };
      if (decision === 'approve' && notes) body.notes = notes;
      if (decision === 'reject') body.reason = reason;

      const res = await fetch(`/api/shares/${appId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Review failed');
        return;
      }

      // Update the application status locally
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, status: decision === 'approve' ? 'approved' : ('rejected' as ShareStatus) }
            : a,
        ),
      );
      setReviewingId(null);
      setReviewAction(null);
      setNotes('');
      setReason('');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const tabLabels: Record<string, string> = {
    all: t('tabAll'),
    under_review: t('tabUnderReview'),
    approved: t('tabApproved'),
    identity_submitted: t('tabIdentity'),
    issued: t('tabIssued'),
    rejected: t('tabRejected'),
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', ...TABS].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as ShareStatus | 'all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Applications list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noApplications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {app.user_name || app.user_email || app.user_id}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('status')}: {app.status} · {t('submitted')}:{' '}
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>

                {app.status === 'under_review' && app.user_id !== currentUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReviewingId(app.id);
                        setReviewAction('approve');
                      }}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => {
                        setReviewingId(app.id);
                        setReviewAction('reject');
                      }}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {t('reject')}
                    </button>
                  </div>
                )}

                {app.user_id === currentUserId && app.status === 'under_review' && (
                  <span className="text-xs text-zinc-400">{t('selfReviewError')}</span>
                )}
              </div>

              {/* Review form */}
              {reviewingId === app.id && (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  {reviewAction === 'approve' && (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  )}
                  {reviewAction === 'reject' && (
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('reasonPlaceholder')}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(app.id, reviewAction!)}
                      disabled={loading || (reviewAction === 'reject' && !reason)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                    >
                      {loading ? t('submitting') : t('submit')}
                    </button>
                    <button
                      onClick={() => {
                        setReviewingId(null);
                        setReviewAction(null);
                      }}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
