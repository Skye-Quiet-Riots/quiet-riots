'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import type { ShareStatus } from '@/types';
import { ShareValueTable } from '@/components/data/share-value-table';
import { ShareEligibilityProgress } from '@/components/data/share-eligibility-progress';
import { ShareStatusTracker } from '@/components/data/share-status-tracker';

interface ShareInfoPageProps {
  application: {
    id: string;
    status: ShareStatus;
    certificate_number: string | null;
    issued_at: string | null;
    reapply_count: number;
    eligible_at: string | null;
    created_at: string;
  };
  eligibility: {
    eligible: boolean;
    riotsJoined: number;
    riotsRequired: number;
    actionsTaken: number;
    actionsRequired: number;
    isVerified: boolean;
  };
  walletBalance: number;
}

export function ShareInfoPage({ application, eligibility, walletBalance }: ShareInfoPageProps) {
  const t = useTranslations('Share');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState<'proceed' | 'decline' | 'withdraw' | null>(null);

  async function handleAction(action: 'proceed' | 'decline' | 'withdraw' | 'reapply') {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint =
        action === 'proceed'
          ? '/api/shares/proceed'
          : action === 'decline'
            ? '/api/shares/decline'
            : action === 'withdraw'
              ? '/api/shares/withdraw'
              : '/api/shares/reapply';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Action failed');
        return;
      }

      const successKey =
        action === 'proceed'
          ? 'proceedSuccess'
          : action === 'decline'
            ? 'declineSuccess'
            : action === 'withdraw'
              ? 'withdrawSuccess'
              : 'reapplySuccess';

      setSuccess(t(successKey));
      setShowConfirm(null);
      // Refresh to show updated status
      router.refresh();
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  const status = application.status;
  const showEligibility = status === 'not_eligible';
  const showActions = status === 'available';
  const showStatus = status !== 'not_eligible' && status !== 'available' && status !== 'declined';
  const showWithdraw = status === 'under_review' || status === 'approved';
  const showReapply = status === 'rejected';
  const showIdentityLink = status === 'approved';
  const showCertificate = status === 'issued';

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('heroSubtitle')}
        </p>
      </div>

      {/* What ownership means */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-bold">{t('ownershipTitle')}</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('ownershipDesc')}</p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span>•</span>
            <span>{t('ownershipPoint1')}</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>{t('ownershipPoint2')}</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>{t('ownershipPoint3')}</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>{t('ownershipPoint4')}</span>
          </li>
        </ul>
      </section>

      {/* 10p consideration */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-bold">{t('considerationTitle')}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('considerationDesc')}</p>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>{t('considerationAmount')}</p>
          <p>{t('considerationWallet')}</p>
          <p>{t('considerationRefund')}</p>
        </div>
      </section>

      {/* Growth shares / valuation table */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-bold">{t('growthSharesTitle')}</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('growthSharesDesc')}</p>
        <ShareValueTable />
      </section>

      {/* Responsibilities */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-bold">{t('responsibilitiesTitle')}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('responsibilitiesDesc')}</p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span>⚠️</span>
            <span>{t('responsibility1')}</span>
          </li>
          <li className="flex gap-2">
            <span>⚠️</span>
            <span>{t('responsibility2')}</span>
          </li>
          <li className="flex gap-2">
            <span>⚠️</span>
            <span>{t('responsibility3')}</span>
          </li>
          <li className="flex gap-2">
            <span>⚠️</span>
            <span>{t('responsibility4')}</span>
          </li>
        </ul>
      </section>

      {/* Disclaimers */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-200">
          {t('disclaimerTitle')}
        </h2>
        <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
          <li>{t('disclaimer1')}</li>
          <li>{t('disclaimer2')}</li>
          <li>{t('disclaimer3')}</li>
          <li>{t('disclaimer4')}</li>
          <li>{t('disclaimer5')}</li>
        </ul>
      </section>

      {/* Error / Success */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Eligibility progress */}
      {showEligibility && <ShareEligibilityProgress eligibility={eligibility} />}

      {/* Certificate */}
      {showCertificate && application.certificate_number && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
          <h2 className="mb-3 text-lg font-bold text-green-800 dark:text-green-200">
            {t('certificateTitle')}
          </h2>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <p>
              <span className="font-medium">{t('certificateNumber')}:</span>{' '}
              {application.certificate_number}
            </p>
            {application.issued_at && (
              <p>
                <span className="font-medium">{t('certificateIssued')}:</span>{' '}
                {new Date(application.issued_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Status tracker for in-progress applications */}
      {showStatus && <ShareStatusTracker status={status} />}

      {/* Identity link */}
      {showIdentityLink && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="mb-3 text-lg font-bold text-blue-800 dark:text-blue-200">
            {t('identityTitle')}
          </h2>
          <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">{t('identityDesc')}</p>
          <Link
            href="/share/identity"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {t('identitySubmit')}
          </Link>
        </section>
      )}

      {/* Action buttons for eligible users */}
      {showActions && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold">{t('proceedTitle')}</h2>

          {walletBalance >= 10 ? (
            <>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('proceedDesc')}</p>

              {showConfirm === 'proceed' ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="mb-3 text-sm">{t('proceedConfirm')}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('proceed')}
                      disabled={loading}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                    >
                      {loading ? '...' : t('proceedConfirmButton')}
                    </button>
                    <button
                      onClick={() => setShowConfirm(null)}
                      disabled={loading}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
                    >
                      {t('proceedCancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm('proceed')}
                  className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {t('proceedButton')}
                </button>
              )}
            </>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p className="mb-2">{t('insufficientFunds')}</p>
              <Link
                href="/wallet"
                className="font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                {t('topUpFirst')}
              </Link>
            </div>
          )}

          {/* Decline option */}
          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t('declineTitle')}
            </h3>
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">{t('declineDesc')}</p>

            {showConfirm === 'decline' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p className="mb-3 text-sm text-red-700 dark:text-red-300">{t('declineConfirm')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('decline')}
                    disabled={loading}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {loading ? '...' : t('declineConfirmButton')}
                  </button>
                  <button
                    onClick={() => setShowConfirm(null)}
                    disabled={loading}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
                  >
                    {t('proceedCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm('decline')}
                className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                {t('declineButton')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Withdraw option */}
      {showWithdraw && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-bold">{t('withdrawTitle')}</h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{t('withdrawDesc')}</p>

          {showConfirm === 'withdraw' ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="mb-3 text-sm">{t('withdrawConfirm')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('withdraw')}
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  {loading ? '...' : t('withdrawConfirmButton')}
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
                >
                  {t('proceedCancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm('withdraw')}
              className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400"
            >
              {t('withdrawButton')}
            </button>
          )}
        </section>
      )}

      {/* Reapply option */}
      {showReapply && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-bold">{t('reapplyTitle')}</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{t('reapplyDesc')}</p>
          {walletBalance >= 10 ? (
            <button
              onClick={() => handleAction('reapply')}
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? '...' : t('reapplyButton')}
            </button>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p className="mb-2">{t('insufficientFunds')}</p>
              <Link
                href="/wallet"
                className="font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                {t('topUpFirst')}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
