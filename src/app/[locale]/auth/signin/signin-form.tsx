'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Tab = 'email' | 'phone';
type EmailMode = 'password' | 'magic-link';

export function SignInForm() {
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<EmailMode>('password');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const t = useTranslations('Auth');
  const locale = useLocale();

  const callbackUrl = `/${locale}`;

  async function handleOAuth(provider: string) {
    setIsLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading('email');
    setEmailError('');
    await signIn('resend', { email: email.trim().toLowerCase(), redirect: false, callbackUrl });
    setEmailSent(true);
    setIsLoading(null);
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoading('password');
    setEmailError('');

    try {
      const res = await fetch('/api/auth/password/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        window.location.assign(callbackUrl);
      } else {
        // Map error codes to user-friendly messages
        if (data.code === 'NO_PASSWORD') {
          setEmailError(t('noPasswordSet'));
          setEmailMode('magic-link');
        } else if (data.code === 'RATE_LIMITED') {
          setEmailError(data.error);
        } else if (data.code === 'INVALID_CREDENTIALS') {
          setEmailError(t('wrongPassword'));
        } else {
          setEmailError(data.error || t('wrongPassword'));
        }
      }
    } catch {
      setEmailError('Network error');
    }
    setIsLoading(null);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setPhoneError('');
    setIsLoading('phone');

    const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;

    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (data.ok) {
        setCodeSent(true);
      } else {
        setPhoneError(data.error || 'Failed to send code');
      }
    } catch {
      setPhoneError('Network error');
    }
    setIsLoading(null);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) return;
    setPhoneError('');
    setIsLoading('verify');

    const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;

    try {
      const res = await fetch('/api/auth/phone/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otpCode }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.assign(callbackUrl);
      } else {
        setPhoneError(data.error || t('invalidCode'));
      }
    } catch {
      setPhoneError('Network error');
    }
    setIsLoading(null);
  }

  if (emailSent) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4">
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold">{t('checkEmail')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('signInLinkSent')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-center text-2xl font-bold">{t('welcomeBack')}</h1>
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t('signInSubtitle')}
        </p>

        {/* OAuth providers */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth('google')}
            disabled={isLoading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
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
            {isLoading === 'google' ? t('connecting') : t('continueGoogle')}
          </button>

          <button
            onClick={() => handleOAuth('facebook')}
            disabled={isLoading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#166FE5] disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {isLoading === 'facebook' ? t('connecting') : t('continueFacebook')}
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400">{t('or')}</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Tabs: Email / Phone */}
        <div className="mb-4 flex rounded-lg border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setTab('email')}
            className={`flex-1 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'email'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t('emailTab')}
          </button>
          <button
            onClick={() => setTab('phone')}
            className={`flex-1 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'phone'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t('phoneTab')}
          </button>
        </div>

        {tab === 'email' ? (
          emailMode === 'password' ? (
            /* Email + Password sign in */
            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <label htmlFor="email" className="sr-only">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                placeholder={t('emailLabel')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <label htmlFor="password" className="sr-only">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                placeholder={t('passwordLabel')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setEmailError('');
                }}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              <button
                type="submit"
                disabled={isLoading !== null || !email.trim() || !password}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isLoading === 'password' ? t('signingIn') : t('signInWithPassword')}
              </button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('magic-link');
                    setEmailError('');
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {t('useMagicLink')}
                </button>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </form>
          ) : (
            /* Email magic link */
            <form onSubmit={handleMagicLink} className="space-y-3">
              <label htmlFor="email-magic" className="sr-only">
                {t('emailLabel')}
              </label>
              <input
                id="email-magic"
                type="email"
                placeholder={t('emailLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              <button
                type="submit"
                disabled={isLoading !== null || !email.trim()}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isLoading === 'email' ? t('sendingLink') : t('sendMagicLink')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('password');
                  setEmailError('');
                }}
                className="w-full text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t('signInWithPassword')}
              </button>
            </form>
          )
        ) : codeSent ? (
          /* OTP code entry */
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('codeSent')}</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t('codeLabel')}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-center text-lg tracking-[0.5em] text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
            {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
            <button
              type="submit"
              disabled={isLoading !== null || otpCode.length !== 6}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading === 'verify' ? t('verifyingCode') : t('signInWithPhone')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setOtpCode('');
                setPhoneError('');
              }}
              className="w-full text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {t('resendCode')}
            </button>
          </form>
        ) : (
          /* Phone number entry */
          <form onSubmit={handleSendCode} className="space-y-3">
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
                placeholder={t('phoneLabel')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
            <button
              type="submit"
              disabled={isLoading !== null || !phone.trim()}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading === 'phone' ? t('sendingCode') : t('sendCode')}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          {t('noAccount')}{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:underline dark:text-blue-400">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
