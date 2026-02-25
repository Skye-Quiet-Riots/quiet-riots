'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ConnectedAccount {
  provider: string;
  type: string;
}

interface ConnectedAccountsProps {
  accounts: ConnectedAccount[];
}

const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
];

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') return <GoogleIcon />;
  if (provider === 'facebook') return <FacebookIcon />;
  return null;
}

export function ConnectedAccounts({ accounts: initialAccounts }: ConnectedAccountsProps) {
  const t = useTranslations('Profile');
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const connectedProviders = new Set(accounts.map((a) => a.provider));

  async function handleLink(provider: string) {
    setLoading(provider);
    setError('');
    await signIn(provider, { callbackUrl: '/profile' });
  }

  async function handleUnlink(provider: string) {
    setLoading(provider);
    setError('');

    try {
      const res = await fetch('/api/users/me/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();

      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.provider !== provider));
      } else {
        setError(data.error || t('unlinkFailed'));
      }
    } catch {
      setError(t('unlinkFailed'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold">{t('connectedAccounts')}</h2>

      <div className="space-y-3">
        {PROVIDERS.map(({ id, label }) => {
          const isConnected = connectedProviders.has(id);
          const isLoading = loading === id;

          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <ProviderIcon provider={id} />
                <span className="font-medium">{label}</span>
                {isConnected && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {t('connected')}
                  </span>
                )}
              </div>

              {isConnected ? (
                <button
                  type="button"
                  onClick={() => handleUnlink(id)}
                  disabled={isLoading || accounts.length <= 1}
                  title={accounts.length <= 1 ? t('cannotUnlinkLast') : undefined}
                  className="text-sm text-zinc-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  {isLoading ? t('unlinking') : t('unlink')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLink(id)}
                  disabled={isLoading}
                  className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {isLoading ? t('linking') : t('link')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
