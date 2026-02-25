'use client';

import { useState } from 'react';
import type { IssueSuggestion, SuggestionStatus } from '@/types';

const STATUS_TABS: { label: string; value: SuggestionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending_review' },
  { label: 'More Info', value: 'more_info_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Translations', value: 'translations_ready' },
  { label: 'Live', value: 'live' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Merged', value: 'merged' },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  more_info_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  translations_ready: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  live: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  merged: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SetupDashboardProps {
  initialSuggestions: IssueSuggestion[];
}

export function SetupDashboard({ initialSuggestions }: SetupDashboardProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [activeTab, setActiveTab] = useState<SuggestionStatus | 'all'>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered =
    activeTab === 'all' ? suggestions : suggestions.filter((s) => s.status === activeTab);

  const pendingCount = suggestions.filter((s) => s.status === 'pending_review').length;

  async function handleReview(id: string, decision: string, extra: Record<string, unknown> = {}) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/suggestions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => prev.map((s) => (s.id === id ? data.data.suggestion : s)));
        setReviewingId(null);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGoLive(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/suggestions/${id}/go-live`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => prev.map((s) => (s.id === id ? data.data.suggestion : s)));
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? suggestions.length
              : suggestions.filter((s) => s.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                activeTab === tab.value
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {pendingCount} suggestion{pendingCount !== 1 ? 's' : ''} waiting for review
          </p>
        </div>
      )}

      {/* Suggestion cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
          No suggestions in this category
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {s.suggested_name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[s.status] || 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {s.status.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {s.suggested_type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Category: <strong>{s.category}</strong> &middot; Created{' '}
                    {formatDate(s.created_at)}
                  </p>
                  {s.original_text && (
                    <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
                      &ldquo;{s.original_text}&rdquo;
                    </p>
                  )}
                  {s.description && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.description}</p>
                  )}
                  {s.close_match_ids && (
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      Close matches: {s.close_match_ids}
                    </p>
                  )}
                  {s.reviewer_notes && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      Reviewer notes: {s.reviewer_notes}
                    </p>
                  )}
                  {s.rejection_reason && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Rejection: {s.rejection_reason}
                      {s.rejection_detail ? ` — ${s.rejection_detail}` : ''}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>Recognition: {s.public_recognition ? 'Public' : 'Anonymous'}</span>
                    {s.reviewed_at && <span>&middot; Reviewed: {formatDate(s.reviewed_at)}</span>}
                    {s.approved_at && <span>&middot; Approved: {formatDate(s.approved_at)}</span>}
                    {s.live_at && <span>&middot; Live: {formatDate(s.live_at)}</span>}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {s.status === 'pending_review' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {reviewingId === s.id ? (
                    <ReviewForm
                      suggestionId={s.id}
                      onReview={handleReview}
                      onCancel={() => setReviewingId(null)}
                      loading={actionLoading}
                    />
                  ) : (
                    <button
                      onClick={() => setReviewingId(s.id)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Review
                    </button>
                  )}
                </div>
              )}
              {(s.status === 'approved' || s.status === 'translations_ready') && (
                <div className="mt-4">
                  <button
                    onClick={() => handleGoLive(s.id)}
                    disabled={actionLoading}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Go Live
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  suggestionId,
  onReview,
  onCancel,
  loading,
}: {
  suggestionId: string;
  onReview: (id: string, decision: string, extra?: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [decision, setDecision] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionDetail, setRejectionDetail] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [mergeIssueId, setMergeIssueId] = useState('');

  function handleSubmit() {
    const extra: Record<string, unknown> = {};
    if (reviewerNotes) extra.reviewer_notes = reviewerNotes;
    if (decision === 'reject') {
      extra.rejection_reason = rejectionReason;
      if (rejectionDetail) extra.rejection_detail = rejectionDetail;
    }
    if (decision === 'merge' && mergeIssueId) {
      extra.merge_into_issue_id = mergeIssueId;
    }
    if (decision === 'more_info') {
      extra.reviewer_notes = reviewerNotes;
    }
    onReview(suggestionId, decision, extra);
  }

  return (
    <div className="w-full space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex flex-wrap gap-2">
        {['approve', 'reject', 'merge', 'more_info'].map((d) => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              decision === d
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'
            }`}
          >
            {d === 'more_info' ? 'Ask Info' : d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {decision === 'reject' && (
        <select
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        >
          <option value="">Select reason...</option>
          <option value="close_to_existing">Close to existing Quiet Riot</option>
          <option value="about_people">About people, not issues</option>
          <option value="illegal_subject">Illegal subject</option>
          <option value="other">Other</option>
        </select>
      )}

      {(decision === 'reject' || decision === 'more_info') && (
        <textarea
          value={decision === 'reject' ? rejectionDetail : reviewerNotes}
          onChange={(e) =>
            decision === 'reject'
              ? setRejectionDetail(e.target.value)
              : setReviewerNotes(e.target.value)
          }
          placeholder={decision === 'reject' ? 'Detail (optional)...' : 'Your question...'}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          rows={2}
        />
      )}

      {decision === 'approve' && (
        <textarea
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          placeholder="Notes (optional)..."
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          rows={2}
        />
      )}

      {decision === 'merge' && (
        <input
          type="text"
          value={mergeIssueId}
          onChange={(e) => setMergeIssueId(e.target.value)}
          placeholder="Issue ID to merge into..."
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!decision || loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md bg-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
