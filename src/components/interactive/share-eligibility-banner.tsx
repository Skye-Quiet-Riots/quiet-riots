'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function ShareEligibilityBanner() {
  const t = useTranslations('Share');
  const [status, setStatus] = useState<'loading' | 'eligible' | 'requested' | 'hidden'>('loading');

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/shares');
        if (!res.ok) {
          setStatus('hidden');
          return;
        }
        const data = await res.json();
        if (data.data?.application?.status === 'available') {
          setStatus('eligible');
        } else {
          setStatus('hidden');
        }
      } catch {
        setStatus('hidden');
      }
    }
    check();
  }, []);

  if (status === 'loading' || status === 'hidden') return null;

  return (
    <section className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
          {t('issueEligibilityBanner')}
        </p>
        {status === 'eligible' ? (
          <button
            onClick={() => setStatus('requested')}
            className="shrink-0 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            {t('issueRequestButton')}
          </button>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400">{t('issueRequestReceived')}</p>
        )}
      </div>
    </section>
  );
}
