'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

interface ChickenCancelButtonProps {
  deploymentId: string;
}

export function ChickenCancelButton({ deploymentId }: ChickenCancelButtonProps) {
  const t = useTranslations('ChickenDetail');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleCancel() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/chicken/deployments/${deploymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t('cancelFailed', { error: data.error || 'Unknown error' }));
        return;
      }
      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } catch {
      setError(t('cancelFailed', { error: 'Network error' }));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
        {t('cancelSuccess')}
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/50"
      >
        {loading ? t('cancelling') : t('cancelDeployment')}
      </button>
    </div>
  );
}
