'use client';

import { useTranslations } from 'next-intl';

interface ShareEligibilityProgressProps {
  eligibility: {
    eligible: boolean;
    riotsJoined: number;
    riotsRequired: number;
    actionsTaken: number;
    actionsRequired: number;
    isVerified: boolean;
  };
}

export function ShareEligibilityProgress({ eligibility }: ShareEligibilityProgressProps) {
  const t = useTranslations('Share');

  const riotPct = Math.min(
    100,
    Math.round((eligibility.riotsJoined / eligibility.riotsRequired) * 100),
  );
  const actionPct = Math.min(
    100,
    Math.round((eligibility.actionsTaken / eligibility.actionsRequired) * 100),
  );

  if (eligibility.eligible) {
    return (
      <section className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
          {t('eligibilityMet')}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-3 text-lg font-bold">{t('eligibilityTitle')}</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('eligibilityDesc')}</p>

      <div className="space-y-4">
        {/* Verification */}
        <div className="flex items-center gap-3">
          <span
            className={`text-lg ${eligibility.isVerified ? 'text-green-500' : 'text-zinc-300 dark:text-zinc-600'}`}
          >
            {eligibility.isVerified ? '✓' : '○'}
          </span>
          <span className="text-sm">
            {eligibility.isVerified ? t('eligibilityVerifiedStatus') : t('eligibilityNotVerified')}
          </span>
        </div>

        {/* Riots progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>
              {t('eligibilityRiotProgress', {
                current: eligibility.riotsJoined,
                required: eligibility.riotsRequired,
              })}
            </span>
            <span
              className={
                eligibility.riotsJoined >= eligibility.riotsRequired
                  ? 'text-green-500'
                  : 'text-zinc-400'
              }
            >
              {eligibility.riotsJoined >= eligibility.riotsRequired ? '✓' : `${riotPct}%`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${riotPct}%` }}
            />
          </div>
        </div>

        {/* Actions progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>
              {t('eligibilityActionProgress', {
                current: eligibility.actionsTaken,
                required: eligibility.actionsRequired,
              })}
            </span>
            <span
              className={
                eligibility.actionsTaken >= eligibility.actionsRequired
                  ? 'text-green-500'
                  : 'text-zinc-400'
              }
            >
              {eligibility.actionsTaken >= eligibility.actionsRequired ? '✓' : `${actionPct}%`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${actionPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
