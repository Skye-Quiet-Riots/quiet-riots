'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function SharePasswordGate() {
  const t = useTranslations('Share');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shares/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError(t('passwordIncorrect'));
        return;
      }

      // Cookie set by server — refresh to re-check layout
      router.refresh();
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="mb-2 text-lg font-bold">{t('passwordTitle')}</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t('passwordDesc')}</p>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="share-password" className="mb-1 block text-sm font-medium">
            {t('passwordLabel')}
          </label>
          <input
            id="share-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordPlaceholder')}
            className="mb-4 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {loading ? '...' : t('passwordButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
