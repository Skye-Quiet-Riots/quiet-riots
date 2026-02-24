// Translation keys: CookieConsent.title, CookieConsent.description, CookieConsent.acceptAll,
// CookieConsent.essentialOnly, CookieConsent.manage, CookieConsent.essential,
// CookieConsent.essentialDescription, CookieConsent.analytics, CookieConsent.analyticsDescription,
// CookieConsent.save
'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

const COOKIE_NAME = 'qr_consent';
const COOKIE_VERSION = '1.0';
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

interface ConsentPreferences {
  analytics: boolean;
  version: string;
}

function readConsentCookie(): ConsentPreferences | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && typeof parsed.analytics === 'boolean' && parsed.version) {
      return parsed as ConsentPreferences;
    }
  } catch {
    // Malformed cookie — treat as no consent
  }
  return null;
}

function writeConsentCookie(prefs: ConsentPreferences) {
  const value = encodeURIComponent(JSON.stringify(prefs));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

function dispatchConsentEvent(prefs: ConsentPreferences) {
  window.dispatchEvent(new CustomEvent('consent-updated', { detail: prefs }));
}

export function CookieConsent() {
  const t = useTranslations('CookieConsent');
  const [visible, setVisible] = useState(() => {
    if (typeof document === 'undefined') return false;
    return !readConsentCookie();
  });
  const [expanded, setExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const savePreferences = useCallback((prefs: ConsentPreferences) => {
    writeConsentCookie(prefs);
    dispatchConsentEvent(prefs);
    setVisible(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    savePreferences({ analytics: true, version: COOKIE_VERSION });
  }, [savePreferences]);

  const handleEssentialOnly = useCallback(() => {
    savePreferences({ analytics: false, version: COOKIE_VERSION });
  }, [savePreferences]);

  const handleSave = useCallback(() => {
    savePreferences({ analytics: analyticsEnabled, version: COOKIE_VERSION });
  }, [savePreferences, analyticsEnabled]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-xl backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t('description')}</p>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            {/* Essential — always on */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('essential')}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('essentialDescription')}
                </p>
              </div>
              <button
                type="button"
                disabled
                aria-label={t('essential')}
                className="relative inline-flex h-6 w-10 shrink-0 cursor-not-allowed rounded-full bg-green-500 opacity-70"
              >
                <span className="pointer-events-none inline-block h-5 w-5 translate-x-4 translate-y-0.5 rounded-full bg-white shadow transition" />
              </button>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('analytics')}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('analyticsDescription')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled}
                aria-label={t('analytics')}
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors ${
                  analyticsEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                    analyticsEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t('acceptAll')}
          </button>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {t('essentialOnly')}
          </button>
          {expanded ? (
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {t('save')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {t('manage')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
