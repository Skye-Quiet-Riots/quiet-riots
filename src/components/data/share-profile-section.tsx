'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ShareStatus } from '@/types';

interface ShareProfileSectionProps {
  status: ShareStatus;
  certificateNumber: string | null;
  issuedAt: string | null;
  eligibility: {
    riotsJoined: number;
    riotsRequired: number;
    actionsTaken: number;
    actionsRequired: number;
  };
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  not_eligible: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  under_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  identity_submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  forwarded_senior: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  issued: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  declined: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  withdrawn: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export function ShareProfileSection({
  status,
  certificateNumber,
  issuedAt,
  eligibility,
}: ShareProfileSectionProps) {
  const t = useTranslations('Share');

  const statusLabels: Record<string, string> = {
    not_eligible: t('profileNotEligible'),
    available: t('profileAvailable'),
    under_review: t('profileUnderReview'),
    approved: t('profileApproved'),
    identity_submitted: t('profileIdentitySubmitted'),
    forwarded_senior: t('profileForwarded'),
    issued: t('profileIssued'),
    declined: t('profileDeclined'),
    rejected: t('profileRejected'),
    withdrawn: t('profileWithdrawn'),
  };

  const badgeStyle = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES['not_eligible'];

  return (
    <section className="mb-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">{t('profileTitle')}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyle}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Progress bar for not_eligible */}
        {status === 'not_eligible' && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {t('profileProgress', {
              riotsJoined: eligibility.riotsJoined,
              riotsRequired: eligibility.riotsRequired,
              actionsTaken: eligibility.actionsTaken,
              actionsRequired: eligibility.actionsRequired,
            })}
          </p>
        )}

        {/* Certificate details for issued */}
        {status === 'issued' && certificateNumber && (
          <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <p>{t('profileCertificate', { number: certificateNumber })}</p>
            {issuedAt && (
              <p>
                {t('profileIssuedAt', {
                  date: new Date(issuedAt).toLocaleDateString(),
                })}
              </p>
            )}
          </div>
        )}

        <Link
          href="/share"
          className="mt-3 inline-block text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          {t('profileLink')}
        </Link>
      </div>
    </section>
  );
}
