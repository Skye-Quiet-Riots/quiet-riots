'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AssistantCategory } from '@/types';
import { AuthGate } from './auth-gate';

interface ClaimFormProps {
  category: AssistantCategory;
  humanName: string;
}

export function ClaimForm({ category, humanName }: ClaimFormProps) {
  const t = useTranslations('Claim');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/assistants/${category}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setStatus('success');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
        <p className="font-medium text-green-800 dark:text-green-300">
          {t('success', { name: humanName })}
        </p>
      </div>
    );
  }

  return (
    <AuthGate action="express interest in this role">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('placeholder', { name: humanName })}
          maxLength={1000}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder-zinc-500"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'submitting' ? t('submitting') : t('expressInterest')}
        </button>
        {status === 'error' && (
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        )}
      </form>
    </AuthGate>
  );
}
