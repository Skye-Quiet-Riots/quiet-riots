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

interface ComplianceDashboardProps {
  initialApplications: Application[];
  currentUserId: string;
}

export function ComplianceDashboard({
  initialApplications,
  currentUserId,
}: ComplianceDashboardProps) {
  const t = useTranslations('Compliance');
  const [applications, setApplications] = useState(initialApplications);
  const [activeTab, setActiveTab] = useState<'identity_submitted' | 'forwarded_senior'>(
    'identity_submitted',
  );
  const [actionId, setActionId] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'forward' | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = applications.filter((a) => a.status === activeTab);

  async function handleAction(appId: string, decision: string) {
    setLoading(true);
    setError('');

    try {
      const body: Record<string, string> = { decision };
      if (decision === 'approve' && notes) body.notes = notes;
      if (decision === 'reject') body.reason = reason;
      if (decision === 'forward' && notes) body.notes = notes;

      const res = await fetch(`/api/shares/${appId}/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Action failed');
        return;
      }

      // Update local state
      const newStatus: ShareStatus =
        decision === 'approve' ? 'issued' : decision === 'reject' ? 'rejected' : 'forwarded_senior';

      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
      );
      setActionId(null);
      setAction(null);
      setNotes('');
      setReason('');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('identity_submitted')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'identity_submitted'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {t('tabIdentity')}
        </button>
        <button
          onClick={() => setActiveTab('forwarded_senior')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'forwarded_senior'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {t('tabForwarded')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

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
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>

                {app.user_id !== currentUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActionId(app.id);
                        setAction('approve');
                      }}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => {
                        setActionId(app.id);
                        setAction('reject');
                      }}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {t('reject')}
                    </button>
                    {activeTab === 'identity_submitted' && (
                      <button
                        onClick={() => {
                          setActionId(app.id);
                          setAction('forward');
                        }}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                      >
                        {t('forward')}
                      </button>
                    )}
                  </div>
                )}

                {app.user_id === currentUserId && (
                  <span className="text-xs text-zinc-400">{t('selfReviewError')}</span>
                )}
              </div>

              {/* Action form */}
              {actionId === app.id && (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  {action === 'reject' ? (
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('reasonPlaceholder')}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  ) : (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(app.id, action!)}
                      disabled={loading || (action === 'reject' && !reason)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                    >
                      {loading ? t('submitting') : t('submit')}
                    </button>
                    <button
                      onClick={() => {
                        setActionId(null);
                        setAction(null);
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
