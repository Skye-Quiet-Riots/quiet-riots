'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface PasswordManagementProps {
  hasPassword: boolean;
}

export function PasswordManagement({ hasPassword }: PasswordManagementProps) {
  const t = useTranslations('Profile');
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword.length < 10) {
      setError(t('passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body: Record<string, string> = { newPassword };
      if (hasPassword && currentPassword) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess(hasPassword ? t('passwordChanged') : t('passwordSet'));
        setIsEditing(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (data.code === 'PASSWORD_BREACHED') {
          setError(t('passwordBreached'));
        } else if (data.code === 'INVALID_CREDENTIALS') {
          setError(t('wrongCurrentPassword'));
        } else {
          setError(data.error || t('passwordChangeFailed'));
        }
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  function reset() {
    setIsEditing(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold">{t('passwordSection')}</h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {hasPassword ? t('passwordIsSet') : t('noPasswordSet')}
              </span>
              {hasPassword && (
                <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  ✓
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setSuccess('');
              }}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {hasPassword ? t('changePassword') : t('setPassword')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {hasPassword && (
              <>
                <label htmlFor="current-pw" className="sr-only">
                  {t('currentPassword')}
                </label>
                <input
                  id="current-pw"
                  type="password"
                  placeholder={t('currentPassword')}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setError('');
                  }}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  autoFocus
                />
              </>
            )}
            <label htmlFor="new-pw" className="sr-only">
              {t('newPassword')}
            </label>
            <input
              id="new-pw"
              type="password"
              placeholder={t('newPassword')}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
              }}
              required
              minLength={10}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus={!hasPassword}
            />
            <p className="text-xs text-zinc-400">{t('passwordRequirements')}</p>
            <label htmlFor="confirm-pw" className="sr-only">
              {t('confirmNewPassword')}
            </label>
            <input
              id="confirm-pw"
              type="password"
              placeholder={t('confirmNewPassword')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? t('saving') : hasPassword ? t('changePassword') : t('setPassword')}
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        )}

        {success && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{success}</p>}
      </div>
    </section>
  );
}
