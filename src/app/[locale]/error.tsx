'use client';

import * as Sentry from '@sentry/nextjs';
import Image from 'next/image';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Error');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <Image src="/logo-192.png" alt="Quiet Riots" width={64} height={64} className="mb-4" />
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
        {error.message || t('description')}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
      >
        {t('tryAgain')}
      </button>
    </div>
  );
}
