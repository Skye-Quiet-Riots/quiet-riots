'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatCurrency } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';
import { AuthGate } from './auth-gate';

interface PayFormProps {
  actionInitiativeId: string;
  actionInitiativeTitle: string;
  userBalance: number;
  currency?: string;
}

const PRESET_AMOUNTS = [
  { label: '50p', pence: 50 },
  { label: '£1', pence: 100 },
  { label: '£2', pence: 200 },
];

export function PayForm({
  actionInitiativeId,
  actionInitiativeTitle,
  userBalance,
  currency = 'GBP',
}: PayFormProps) {
  const t = useTranslations('Pay');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null);

  async function handlePay(amountPence: number) {
    if (amountPence > userBalance) {
      setError(t('insufficientFunds'));
      return;
    }
    if (amountPence < 10) {
      setError(t('minPayment'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_initiative_id: actionInitiativeId,
          amount_pence: amountPence,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('failed'));
        return;
      }

      const data = await res.json();
      setSuccess({
        amount: amountPence,
        newBalance: data.data.wallet_balance_pence,
      });
      trackEvent('action_initiative_payment', {
        actionInitiativeId,
        amountPence,
      });
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pounds = parseFloat(customAmount);
    if (!pounds || pounds <= 0) {
      setError(t('invalidAmount'));
      return;
    }
    handlePay(Math.round(pounds * 100));
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">
        <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">
          {t('success', {
            amount: formatCurrency(success.amount, currency),
            actionInitiative: actionInitiativeTitle,
          })}
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          {t('remainingBalance', { balance: formatCurrency(success.newBalance, currency) })}
        </p>
        {success.newBalance < 100 && (
          <p className="mt-2 text-sm">
            <Link
              href="/wallet"
              className="font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {t('topUpPrompt')}
            </Link>{' '}
            {t('toKeepSupporting')}
          </p>
        )}
      </div>
    );
  }

  return (
    <AuthGate action="commission this service">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('supportProject')}
        </h3>
        <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
          {t('yourBalance')}
          {formatCurrency(userBalance, currency)}
        </p>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mb-3 grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt.pence}
              onClick={() => handlePay(amt.pence)}
              disabled={loading || amt.pence > userBalance}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
            >
              {amt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="number"
            min="0.10"
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={t('customAmount')}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={loading || !customAmount}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {loading ? '...' : t('give')}
          </button>
        </form>

        {userBalance < 10 && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {t('walletEmpty')}{' '}
            <Link
              href="/wallet"
              className="font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {t('topUp')}
            </Link>{' '}
            {t('toSupport')}
          </p>
        )}
      </div>
    </AuthGate>
  );
}
