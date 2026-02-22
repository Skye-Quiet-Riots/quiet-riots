'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPence } from '@/lib/format';

interface ContributeFormProps {
  campaignId: string;
  campaignTitle: string;
  userBalance: number;
}

const PRESET_AMOUNTS = [
  { label: '50p', pence: 50 },
  { label: '£1', pence: 100 },
  { label: '£2', pence: 200 },
];

export function ContributeForm({ campaignId, campaignTitle, userBalance }: ContributeFormProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null);

  async function handleContribute(amountPence: number) {
    if (amountPence > userBalance) {
      setError('Insufficient funds. Top up your wallet first.');
      return;
    }
    if (amountPence < 10) {
      setError('Minimum contribution is 10p');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/wallet/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, amount_pence: amountPence }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Contribution failed');
        return;
      }

      const data = await res.json();
      setSuccess({
        amount: amountPence,
        newBalance: data.data.wallet_balance_pence,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pounds = parseFloat(customAmount);
    if (!pounds || pounds <= 0) {
      setError('Enter a valid amount');
      return;
    }
    handleContribute(Math.round(pounds * 100));
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">
        <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">
          Contributed {formatPence(success.amount)} to {campaignTitle}!
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          Your remaining balance: {formatPence(success.newBalance)}
        </p>
        {success.newBalance < 100 && (
          <p className="mt-2 text-sm">
            <Link
              href="/wallet"
              className="font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              Top up your wallet
            </Link>{' '}
            to keep supporting campaigns.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Contribute
      </h3>
      <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
        Your balance: {formatPence(userBalance)}
      </p>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mb-3 grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt.pence}
            onClick={() => handleContribute(amt.pence)}
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
          placeholder="Custom amount (£)"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={loading || !customAmount}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {loading ? '...' : 'Give'}
        </button>
      </form>

      {userBalance < 10 && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Your wallet is empty.{' '}
          <Link
            href="/wallet"
            className="font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            Top up
          </Link>{' '}
          to contribute.
        </p>
      )}
    </div>
  );
}
