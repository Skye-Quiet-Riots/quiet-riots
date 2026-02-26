'use client';

import { useTranslations } from 'next-intl';
import type { ShareStatus } from '@/types';

interface ShareStatusTrackerProps {
  status: ShareStatus;
}

const STATUS_STEPS: ShareStatus[] = ['under_review', 'approved', 'identity_submitted', 'issued'];

export function ShareStatusTracker({ status }: ShareStatusTrackerProps) {
  const t = useTranslations('Share');

  const statusLabels: Record<string, string> = {
    under_review: t('statusUnderReview'),
    approved: t('statusApproved'),
    identity_submitted: t('statusIdentitySubmitted'),
    forwarded_senior: t('statusForwardedSenior'),
    issued: t('statusIssued'),
    rejected: t('statusRejected'),
    withdrawn: t('statusWithdrawn'),
  };

  // For rejected/withdrawn, show a different visual
  if (status === 'rejected' || status === 'withdrawn') {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-bold">{t('statusTitle')}</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            {statusLabels[status]}
          </p>
        </div>
      </section>
    );
  }

  // For forwarded_senior, treat it as between identity_submitted and issued
  const effectiveStatus = status === 'forwarded_senior' ? 'identity_submitted' : status;
  const currentIdx = STATUS_STEPS.indexOf(effectiveStatus);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold">{t('statusTitle')}</h2>

      <div className="flex items-center gap-2">
        {STATUS_STEPS.map((step, idx) => {
          const isComplete = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={step} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isComplete
                    ? isCurrent
                      ? 'bg-purple-600 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                }`}
              >
                {isComplete && !isCurrent ? '✓' : idx + 1}
              </div>
              <span
                className={`mt-1 text-center text-xs ${
                  isComplete
                    ? 'font-medium text-zinc-900 dark:text-white'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {statusLabels[step]}
              </span>
              {status === 'forwarded_senior' && step === 'identity_submitted' && (
                <span className="mt-0.5 text-center text-[10px] text-amber-600 dark:text-amber-400">
                  {statusLabels['forwarded_senior']}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
