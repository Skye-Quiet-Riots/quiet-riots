'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IssueSuggestion, SuggestionStatus } from '@/types';

const STATUS_TAB_KEYS: { key: string; value: SuggestionStatus | 'all' }[] = [
  { key: 'tabAll', value: 'all' },
  { key: 'tabPending', value: 'pending_review' },
  { key: 'tabMoreInfo', value: 'more_info_requested' },
  { key: 'tabApproved', value: 'approved' },
  { key: 'tabTranslations', value: 'translations_ready' },
  { key: 'tabLive', value: 'live' },
  { key: 'tabRejected', value: 'rejected' },
  { key: 'tabMerged', value: 'merged' },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  more_info_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  translations_ready: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  live: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  merged: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending_review: 'statusPendingReview',
  more_info_requested: 'statusMoreInfoRequested',
  approved: 'statusApproved',
  translations_ready: 'statusTranslationsReady',
  live: 'statusLive',
  rejected: 'statusRejected',
  merged: 'statusMerged',
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

interface SubmitterInfo {
  name: string;
  language: string;
  memberSince: string;
}

interface SetupDashboardProps {
  initialSuggestions: IssueSuggestion[];
  languageMap: Record<string, string>;
  submitterMap: Record<string, SubmitterInfo>;
}

export function SetupDashboard({
  initialSuggestions,
  languageMap,
  submitterMap,
}: SetupDashboardProps) {
  const t = useTranslations('Setup');
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [activeTab, setActiveTab] = useState<SuggestionStatus | 'all'>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [expandedSubmitter, setExpandedSubmitter] = useState<string | null>(null);
  const [translationReviewId, setTranslationReviewId] = useState<string | null>(null);
  const [translationData, setTranslationData] = useState<Record<
    string,
    Record<string, { value: string; source: string }>
  > | null>(null);
  const [translationLanguageNames, setTranslationLanguageNames] = useState<Record<
    string,
    string
  > | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [flaggedLocales, setFlaggedLocales] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [imageGeneratingId, setImageGeneratingId] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

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

  async function triggerTranslationGeneration(id: string) {
    setGeneratingId(id);
    setGenerationSuccess(null);
    setGenerationError(null);
    try {
      const res = await fetch(`/api/suggestions/${id}/generate-translations`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => prev.map((s) => (s.id === id ? data.data.suggestion : s)));
        setGenerationSuccess(id);
      } else {
        setGenerationError(id);
      }
    } catch {
      setGenerationError(id);
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleGenerateImage(id: string) {
    setImageGeneratingId(id);
    setImageSuccess(null);
    setImageError(null);
    try {
      const res = await fetch(`/api/suggestions/${id}/generate-image`, {
        method: 'POST',
      });
      if (res.ok) {
        setImageSuccess(id);
      } else {
        setImageError(id);
      }
    } catch {
      setImageError(id);
    } finally {
      setImageGeneratingId(null);
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
        setTranslationReviewId(null);
        setTranslationData(null);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function loadTranslations(id: string) {
    if (translationReviewId === id) {
      setTranslationReviewId(null);
      setTranslationData(null);
      setTranslationLanguageNames(null);
      setFlaggedLocales(new Set());
      return;
    }
    setTranslationLoading(true);
    setTranslationReviewId(id);
    try {
      const res = await fetch(`/api/suggestions/${id}/translations`);
      if (res.ok) {
        const data = await res.json();
        setTranslationData(data.data.translations);
        setTranslationLanguageNames(data.data.languageNames);
        setFlaggedLocales(new Set());
      }
    } finally {
      setTranslationLoading(false);
    }
  }

  async function handleRegenerateFlagged(id: string) {
    if (flaggedLocales.size === 0) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/suggestions/${id}/translations/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locales: [...flaggedLocales] }),
      });
      if (res.ok) {
        setFlaggedLocales(new Set());
        // Reload translations
        const reloadRes = await fetch(`/api/suggestions/${id}/translations`);
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setTranslationData(data.data.translations);
          setTranslationLanguageNames(data.data.languageNames);
        }
      }
    } finally {
      setRegenerating(false);
    }
  }

  function toggleFlagLocale(locale: string) {
    setFlaggedLocales((prev) => {
      const next = new Set(prev);
      if (next.has(locale)) next.delete(locale);
      else next.add(locale);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TAB_KEYS.map((tab) => {
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
              {t(tab.key)} ({count})
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {t('pendingCount', { count: pendingCount })}
          </p>
        </div>
      )}

      {/* Suggestion cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
          {t('noSuggestions')}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {s.suggested_name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[s.status] || 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {t(STATUS_LABEL_KEYS[s.status] || 'statusPendingReview')}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {s.suggested_type}
                    </span>
                    {s.language_code && s.language_code !== 'en' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {languageMap[s.language_code] || s.language_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {t('category')} <strong>{s.category}</strong> &middot; {t('created')}{' '}
                    {formatDate(s.created_at)}
                  </p>

                  {/* Original submission for non-English */}
                  {s.original_text && s.language_code && s.language_code !== 'en' && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {t('submittedIn', {
                          language: languageMap[s.language_code] || s.language_code,
                        })}
                      </p>
                      <p className="mt-1 text-sm italic text-amber-900 dark:text-amber-100">
                        &ldquo;{s.original_text}&rdquo;
                      </p>
                    </div>
                  )}
                  {/* For English submissions, show original_text in the old style */}
                  {s.original_text && (!s.language_code || s.language_code === 'en') && (
                    <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
                      &ldquo;{s.original_text}&rdquo;
                    </p>
                  )}
                  {s.description && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.description}</p>
                  )}
                  {s.close_match_ids && (
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      {t('closeMatches')} {s.close_match_ids}
                    </p>
                  )}
                  {s.reviewer_notes && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {t('reviewerNotes')} {s.reviewer_notes}
                    </p>
                  )}
                  {s.rejection_reason && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {t('rejection')} {s.rejection_reason}
                      {s.rejection_detail ? ` — ${s.rejection_detail}` : ''}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>
                      {t('recognition')}{' '}
                      {s.public_recognition ? t('recognitionPublic') : t('recognitionAnonymous')}
                    </span>
                    {s.reviewed_at && (
                      <span>
                        &middot; {t('reviewed')} {formatDate(s.reviewed_at)}
                      </span>
                    )}
                    {s.approved_at && (
                      <span>
                        &middot; {t('approved')} {formatDate(s.approved_at)}
                      </span>
                    )}
                    {s.live_at && (
                      <span>
                        &middot; {t('live')} {formatDate(s.live_at)}
                      </span>
                    )}
                  </div>

                  {/* Inline submitter info */}
                  {submitterMap[s.suggested_by] && (
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          setExpandedSubmitter(expandedSubmitter === s.id ? null : s.id)
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {expandedSubmitter === s.id ? t('hideSubmitter') : t('viewSubmitter')}
                      </button>
                      {expandedSubmitter === s.id && (
                        <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                          <div className="space-y-1">
                            <p className="text-zinc-600 dark:text-zinc-300">
                              <span className="font-medium">{t('submitterName')}</span>{' '}
                              {submitterMap[s.suggested_by].name}
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-300">
                              <span className="font-medium">{t('submitterLanguage')}</span>{' '}
                              {languageMap[submitterMap[s.suggested_by].language] ||
                                submitterMap[s.suggested_by].language}
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-300">
                              <span className="font-medium">{t('submitterMemberSince')}</span>{' '}
                              {formatDate(submitterMap[s.suggested_by].memberSince)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                      {t('reviewButton')}
                    </button>
                  )}
                </div>
              )}
              {s.status === 'approved' && (
                <div className="mt-4 space-y-2" role="status" aria-live="polite">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t('translationsBeingGenerated')}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => triggerTranslationGeneration(s.id)}
                      disabled={generatingId === s.id}
                      aria-busy={generatingId === s.id}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {generatingId === s.id
                        ? t('generatingTranslations')
                        : t('generateTranslations')}
                    </button>
                    {generationSuccess === s.id && (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {t('translationSuccess')}
                      </span>
                    )}
                    {generationError === s.id && (
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        {t('translationSlower')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {s.status === 'translations_ready' && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => loadTranslations(s.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {translationReviewId === s.id
                        ? t('hideTranslations')
                        : t('reviewTranslations')}
                    </button>
                    <button
                      onClick={() => handleGoLive(s.id)}
                      disabled={actionLoading}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {t('approveAndGoLive')}
                    </button>
                    <button
                      onClick={() => handleGenerateImage(s.id)}
                      disabled={imageGeneratingId === s.id}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {imageGeneratingId === s.id
                        ? t('generatingImage')
                        : t('generateImage')}
                    </button>
                    {imageSuccess === s.id && (
                      <span className="self-center text-sm text-green-600 dark:text-green-400">
                        {t('imageGenerated')}
                      </span>
                    )}
                    {imageError === s.id && (
                      <span className="self-center text-sm text-red-600 dark:text-red-400">
                        {t('imageGenerationFailed')}
                      </span>
                    )}
                  </div>

                  {/* Translation review panel */}
                  {translationReviewId === s.id && (
                    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950">
                      {translationLoading ? (
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">
                          {t('generatingTranslations')}
                        </p>
                      ) : translationData && Object.keys(translationData).length > 0 ? (
                        <div className="space-y-3">
                          <div className="max-h-96 space-y-2 overflow-y-auto">
                            {Object.entries(translationData)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([locale, fields]) => (
                                <div
                                  key={locale}
                                  className="flex items-start gap-3 rounded border border-indigo-100 bg-white p-2 dark:border-indigo-800 dark:bg-indigo-900"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                        {translationLanguageNames?.[locale] || locale}
                                      </span>
                                      <span className="text-xs text-zinc-400">
                                        {fields.name?.source === 'reviewed'
                                          ? t('translationSourceReviewed')
                                          : t('translationSourceMachine')}
                                      </span>
                                    </div>
                                    {Object.entries(fields).map(([field, data]) => (
                                      <p
                                        key={field}
                                        className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300"
                                      >
                                        <span className="font-medium">{field}:</span> {data.value}
                                      </p>
                                    ))}
                                  </div>
                                  <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                                    <input
                                      type="checkbox"
                                      checked={flaggedLocales.has(locale)}
                                      onChange={() => toggleFlagLocale(locale)}
                                      className="rounded border-zinc-300"
                                    />
                                    {t('flagForRegen')}
                                  </label>
                                </div>
                              ))}
                          </div>
                          {flaggedLocales.size > 0 && (
                            <button
                              onClick={() => handleRegenerateFlagged(s.id)}
                              disabled={regenerating}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {regenerating
                                ? t('regenerating')
                                : t('regenerateFlagged', { count: flaggedLocales.size })}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {t('noTranslationsYet')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {s.status === 'live' && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleGenerateImage(s.id)}
                    disabled={imageGeneratingId === s.id}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {imageGeneratingId === s.id
                      ? t('generatingImage')
                      : t('generateImage')}
                  </button>
                  {imageSuccess === s.id && (
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {t('imageGenerated')}
                    </span>
                  )}
                  {imageError === s.id && (
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {t('imageGenerationFailed')}
                    </span>
                  )}
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
  const t = useTranslations('Setup');
  const [decision, setDecision] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionDetail, setRejectionDetail] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [mergeIssueId, setMergeIssueId] = useState('');

  const DECISION_LABELS: Record<string, string> = {
    approve: t('statusApproved'),
    reject: t('statusRejected'),
    merge: t('statusMerged'),
    more_info: t('askInfoButton'),
  };

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
            {DECISION_LABELS[d]}
          </button>
        ))}
      </div>

      {decision === 'reject' && (
        <select
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        >
          <option value="">{t('selectReason')}</option>
          <option value="close_to_existing">{t('reasonCloseToExisting')}</option>
          <option value="about_people">{t('reasonAboutPeople')}</option>
          <option value="illegal_subject">{t('reasonIllegal')}</option>
          <option value="other">{t('reasonOther')}</option>
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
          placeholder={decision === 'reject' ? t('detailPlaceholder') : t('questionPlaceholder')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          rows={2}
        />
      )}

      {decision === 'approve' && (
        <textarea
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          rows={2}
        />
      )}

      {decision === 'merge' && (
        <input
          type="text"
          value={mergeIssueId}
          onChange={(e) => setMergeIssueId(e.target.value)}
          placeholder={t('mergeIdPlaceholder')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!decision || loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md bg-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
