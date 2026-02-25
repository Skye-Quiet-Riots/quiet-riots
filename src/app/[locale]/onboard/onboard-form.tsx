'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CATEGORIES, CATEGORY_EMOJIS } from '@/types';
import type { Category } from '@/types';
import { trackEvent } from '@/lib/analytics';

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  nl: 'Nederlands',
  sv: 'Svenska',
  da: 'Dansk',
  no: 'Norsk',
  fi: 'Suomi',
  pl: 'Polski',
  cs: 'Čeština',
  sk: 'Slovenčina',
  hu: 'Magyar',
  ro: 'Română',
  bg: 'Български',
  hr: 'Hrvatski',
  sl: 'Slovenščina',
  uk: 'Українська',
  ru: 'Русский',
  tr: 'Türkçe',
  ar: 'العربية',
  he: 'עברית',
  fa: 'فارسی',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  ml: 'മലയാളം',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  tl: 'Filipino',
  sw: 'Kiswahili',
  el: 'Ελληνικά',
  ca: 'Català',
  eu: 'Euskara',
  gl: 'Galego',
};

type Step = 'interests' | 'language' | 'country';

export function OnboardForm() {
  const { status } = useSession();
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const [step, setStep] = useState<Step>('interests');
  const [selectedInterests, setSelectedInterests] = useState<Category[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const supported = Object.keys(LOCALE_NAMES);
    // Check for exact match first (e.g., pt-BR), then base language
    if (supported.includes(navigator.language)) {
      setSelectedLanguage(navigator.language);
    } else if (supported.includes(browserLang)) {
      setSelectedLanguage(browserLang);
    }
  }, []);

  // Fetch countries from DB
  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch('/api/countries');
        if (res.ok) {
          const data = await res.json();
          if (data.ok) setCountries(data.data);
        }
      } catch {
        // Countries endpoint may not exist yet — use empty list
      }
    }
    loadCountries();
  }, []);

  // Check if user already completed onboarding
  useEffect(() => {
    if (status !== 'authenticated') return;
    async function checkOnboarding() {
      try {
        const res = await fetch('/api/users/me/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.data.onboarding_completed) {
            router.replace('/');
            return;
          }
        }
      } catch {
        // Continue with onboarding
      }
      setCheckingOnboarding(false);
    }
    checkOnboarding();
  }, [status, router]);

  // Redirect to sign in if not authenticated
  if (status === 'unauthenticated') {
    router.replace('/auth/signup');
    return null;
  }

  if (status === 'loading' || checkingOnboarding) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  function toggleInterest(category: Category) {
    setSelectedInterests((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  async function handleComplete() {
    if (selectedInterests.length === 0) return;
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        interests: selectedInterests,
      };
      if (selectedLanguage !== 'en') body.language_code = selectedLanguage;
      if (selectedCountry) body.country_code = selectedCountry;

      const res = await fetch('/api/users/me/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        trackEvent('onboarding_completed', {
          interests_count: selectedInterests.length,
          language: selectedLanguage,
          country: selectedCountry || 'none',
        });
        router.replace('/');
      }
    } catch {
      // Allow retry
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCountries = countrySearch
    ? countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : countries;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-8">
      <div className="w-full">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {(['interests', 'language', 'country'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : ['interests', 'language', 'country'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                }`}
              >
                {['interests', 'language', 'country'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${
                    ['interests', 'language', 'country'].indexOf(step) > i
                      ? 'bg-green-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Interests */}
        {step === 'interests' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="mb-2 text-center text-2xl font-bold">{t('interestsTitle')}</h1>
            <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t('interestsSubtitle')}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleInterest(cat)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                    selectedInterests.includes(cat)
                      ? 'border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                  }`}
                  aria-pressed={selectedInterests.includes(cat)}
                >
                  <span className="text-2xl">{CATEGORY_EMOJIS[cat]}</span>
                  <span className="text-xs">{cat}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-zinc-400">
              {t('interestsSelected', { count: selectedInterests.length })}
            </p>

            <button
              onClick={() => setStep('language')}
              disabled={selectedInterests.length === 0}
              className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t('next')}
            </button>
          </div>
        )}

        {/* Step 2: Language */}
        {step === 'language' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="mb-2 text-center text-2xl font-bold">{t('languageTitle')}</h1>
            <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t('languageSubtitle')}
            </p>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              {Object.entries(LOCALE_NAMES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setSelectedLanguage(code)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    selectedLanguage === code
                      ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                  aria-pressed={selectedLanguage === code}
                >
                  <span>{name}</span>
                  {selectedLanguage === code && (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('interests')}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t('back')}
              </button>
              <button
                onClick={() => setStep('country')}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Country */}
        {step === 'country' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="mb-2 text-center text-2xl font-bold">{t('countryTitle')}</h1>
            <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t('countrySubtitle')}
            </p>

            {countries.length > 0 ? (
              <>
                <input
                  type="text"
                  placeholder={t('countrySearch')}
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountry(country.code)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                        selectedCountry === country.code
                          ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                      aria-pressed={selectedCountry === country.code}
                    >
                      <span>{country.name}</span>
                      {selectedCountry === country.code && (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-zinc-400">{t('countrySkip')}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('language')}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t('back')}
              </button>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isSubmitting ? t('saving') : t('complete')}
              </button>
            </div>

            {!selectedCountry && countries.length > 0 && (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="mt-3 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t('skipCountry')}
              </button>
            )}
          </div>
        )}

        {/* Skip onboarding link */}
        {step === 'interests' && (
          <button
            onClick={async () => {
              // Mark as complete with no interests
              setSelectedInterests(CATEGORIES.slice(0, 1)); // Need at least 1
              await fetch('/api/users/me/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interests: [CATEGORIES[0]] }),
              });
              router.replace('/');
            }}
            className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {t('skipAll')}
          </button>
        )}
      </div>
    </div>
  );
}
