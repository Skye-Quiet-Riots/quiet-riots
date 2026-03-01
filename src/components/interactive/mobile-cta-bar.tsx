'use client';

import { useTranslations } from 'next-intl';
import { JoinButton } from './join-button';
import { FollowButton } from './follow-button';

interface MobileCTABarProps {
  issueId: string;
  initialJoined: boolean;
  initialFollowed: boolean;
}

export function MobileCTABar({ issueId, initialJoined, initialFollowed }: MobileCTABarProps) {
  const t = useTranslations('MobileCTA');

  return (
    <div
      role="group"
      aria-label={t('ariaLabel')}
      className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:flex lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex w-full max-w-6xl gap-3">
        <div className="flex-1">
          <JoinButton issueId={issueId} initialJoined={initialJoined} />
        </div>
        <div className="flex-1">
          <FollowButton issueId={issueId} initialFollowed={initialFollowed} />
        </div>
      </div>
    </div>
  );
}
