'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { formatCurrency } from '@/lib/format';
import { AuthGate } from './auth-gate';

interface ChickenDeployFormProps {
  pricingId: string;
  basePricePence: number;
  expressSurchargePence: number;
  currency: string;
  userBalance: number;
  issues: Array<{ id: string; name: string }>;
  countries: Array<{ code: string; name: string }>;
  defaultCountry: string;
}

export function ChickenDeployForm({
  pricingId,
  basePricePence,
  expressSurchargePence,
  currency,
  userBalance,
  issues,
  countries,
  defaultCountry,
}: ChickenDeployFormProps) {
  const t = useTranslations('ChickenDeploy');
  const router = useRouter();

  const [targetName, setTargetName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [targetCity, setTargetCity] = useState('');
  const [targetCountry, setTargetCountry] = useState(defaultCountry);
  const [messageText, setMessageText] = useState('');
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [issueId, setIssueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);

  const totalCost = basePricePence + (expressDelivery ? expressSurchargePence : 0);
  const charsRemaining = 500 - messageText.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chicken/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_name: targetName,
          target_role: targetRole || undefined,
          target_address: targetAddress,
          target_city: targetCity,
          target_country: targetCountry,
          message_text: messageText,
          pricing_id: pricingId,
          amount_paid_pence: totalCost,
          currency,
          express_delivery: expressDelivery,
          issue_id: issueId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('deployFailed'));
        return;
      }

      setSuccessId(data.data.id);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (successId) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950/30">
        <p className="mb-3 text-lg font-semibold text-green-700 dark:text-green-300">
          {t('deploySuccess')}
        </p>
        <button
          onClick={() => router.push(`/chicken/deployments/${successId}`)}
          className="inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
        >
          {t('viewDeployment')}
        </button>
      </div>
    );
  }

  return (
    <AuthGate action="deploy a chicken">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Target Details */}
        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <legend className="px-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('targetDetails')}
          </legend>

          <div className="mt-2 space-y-3">
            <div>
              <label htmlFor="target-name" className="mb-1 block text-sm font-medium">
                {t('targetName')}
              </label>
              <input
                id="target-name"
                type="text"
                required
                maxLength={200}
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={t('targetNamePlaceholder')}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label htmlFor="target-role" className="mb-1 block text-sm font-medium">
                {t('targetRole')}
              </label>
              <input
                id="target-role"
                type="text"
                maxLength={200}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={t('targetRolePlaceholder')}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label htmlFor="target-address" className="mb-1 block text-sm font-medium">
                {t('targetAddress')}
              </label>
              <input
                id="target-address"
                type="text"
                required
                maxLength={500}
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder={t('targetAddressPlaceholder')}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="target-city" className="mb-1 block text-sm font-medium">
                  {t('targetCity')}
                </label>
                <input
                  id="target-city"
                  type="text"
                  required
                  maxLength={200}
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  placeholder={t('targetCityPlaceholder')}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label htmlFor="target-country" className="mb-1 block text-sm font-medium">
                  {t('targetCountry')}
                </label>
                <select
                  id="target-country"
                  required
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
                >
                  <option value="">{t('selectCountry')}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Message */}
        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <legend className="px-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('yourMessage')}
          </legend>
          <div className="mt-2">
            <textarea
              required
              maxLength={500}
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('messagePlaceholder')}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {t('charsRemaining', { count: charsRemaining })}
            </p>
          </div>
        </fieldset>

        {/* Link to Issue */}
        {issues.length > 0 && (
          <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <legend className="px-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t('linkToIssue')}
            </legend>
            <div className="mt-2">
              <select
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400"
              >
                <option value="">{t('noIssue')}</option>
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {/* Delivery Options */}
        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <legend className="px-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('deliveryOptions')}
          </legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <input
                type="radio"
                name="delivery"
                checked={!expressDelivery}
                onChange={() => setExpressDelivery(false)}
                className="text-blue-600"
              />
              <span className="text-sm">{t('standardDelivery')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <input
                type="radio"
                name="delivery"
                checked={expressDelivery}
                onChange={() => setExpressDelivery(true)}
                className="text-blue-600"
              />
              <div>
                <span className="text-sm">{t('expressDelivery')}</span>
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                  {t('expressSurcharge', {
                    amount: formatCurrency(expressSurchargePence, currency),
                  })}
                </span>
              </div>
            </label>
          </div>
        </fieldset>

        {/* Order Summary */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('orderSummary')}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{t('totalCost')}</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalCost, currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {t('yourBalance', { balance: formatCurrency(userBalance, currency) })}
          </p>
        </div>

        {/* Submit */}
        {userBalance < totalCost ? (
          <div className="text-center">
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">{t('insufficientFunds')}</p>
            <Link
              href="/wallet"
              className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              {t('topUpWallet')}
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading || !targetName || !targetAddress || !targetCity || !messageText}
            className="w-full rounded-lg bg-amber-500 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? t('deploying') : t('deployChicken')}
          </button>
        )}
      </form>
    </AuthGate>
  );
}
