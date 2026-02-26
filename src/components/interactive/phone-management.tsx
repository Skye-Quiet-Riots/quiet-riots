'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface PhoneManagementProps {
  currentPhone: string | null;
  phoneVerified: boolean;
}

type Step = 'idle' | 'entering' | 'verifying' | 'confirm-unlink';

export function PhoneManagement({ currentPhone, phoneVerified }: PhoneManagementProps) {
  const t = useTranslations('Profile');
  const [step, setStep] = useState<Step>('idle');
  const [countryCode, setCountryCode] = useState('+44');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSendCode() {
    const phone = `${countryCode}${phoneLocal.replace(/^0+/, '')}`;
    if (!phoneLocal.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/me/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code', phone }),
      });
      const data = await res.json();

      if (data.ok) {
        setFullPhone(phone);
        setStep('verifying');
      } else {
        setError(data.error || t('phoneLinkFailed'));
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleVerify() {
    if (otpCode.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/me/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone: fullPhone, code: otpCode }),
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess(currentPhone ? t('phoneChanged') : t('phoneLinked'));
        setStep('idle');
        // Reload to show updated phone
        window.location.reload();
      } else {
        setError(data.error || t('phoneLinkFailed'));
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleUnlink() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/me/phone', { method: 'DELETE' });
      const data = await res.json();

      if (data.ok) {
        setSuccess(t('phoneUnlinked'));
        setStep('idle');
        window.location.reload();
      } else {
        setError(data.error || t('phoneUnlinkFailed'));
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  function reset() {
    setStep('idle');
    setPhoneLocal('');
    setOtpCode('');
    setError('');
    setSuccess('');
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold">{t('phoneSection')}</h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        {/* Current phone display */}
        {currentPhone ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentPhone}</span>
              {phoneVerified ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {t('phoneVerified')}
                </span>
              ) : (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                  {t('phoneNotVerified')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {step === 'idle' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('entering')}
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {t('changePhone')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('confirm-unlink')}
                    className="text-sm text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  >
                    {t('unlinkPhone')}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400 dark:text-zinc-500">{t('noPhone')}</span>
            {step === 'idle' && (
              <button
                type="button"
                onClick={() => setStep('entering')}
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {t('linkPhone')}
              </button>
            )}
          </div>
        )}

        {/* Unlink confirmation */}
        {step === 'confirm-unlink' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="mb-3 text-sm text-red-700 dark:text-red-300">{t('unlinkPhoneConfirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUnlink}
                disabled={loading}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('unlinking') : t('unlinkPhone')}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Phone entry */}
        {step === 'entering' && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+44"
                className="w-20 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                type="tel"
                placeholder={t('phoneNumber')}
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || !phoneLocal.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? t('sendingCode') : t('sendVerificationCode')}
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* OTP verification */}
        {step === 'verifying' && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('codeSentToPhone')}</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t('sixDigitCode')}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-center text-lg tracking-[0.5em] text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || otpCode.length !== 6}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? t('verifying') : t('verifyAndLink')}
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Error/success messages */}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{success}</p>}
      </div>
    </section>
  );
}
