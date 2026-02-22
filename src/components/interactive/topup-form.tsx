'use client';

import { useState } from 'react';

const PRESET_AMOUNTS = [
  { label: '£1', pence: 100 },
  { label: '£5', pence: 500 },
  { label: '£10', pence: 1000 },
  { label: '£20', pence: 2000 },
];

export function TopUpForm() {
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleTopUp(amountPence: number) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pence: amountPence }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Top-up failed');
        return;
      }

      const data = await res.json();
      window.open(data.data.paymentUrl, '_blank');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pounds = parseFloat(customAmount);
    if (!pounds || pounds < 1) {
      setError('Minimum top-up is £1');
      return;
    }
    handleTopUp(Math.round(pounds * 100));
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Add Funds
      </h3>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt.pence}
            onClick={() => handleTopUp(amt.pence)}
            disabled={loading}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
          >
            {amt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="number"
          min="1"
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
          {loading ? '...' : 'Top Up'}
        </button>
      </form>
    </div>
  );
}
