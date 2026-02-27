'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { RTL_LOCALES } from '@/i18n/locales';
import type { Locale } from '@/i18n/locales';

/**
 * Syncs the <html> element's lang and dir attributes with the current locale.
 *
 * The root layout (src/app/layout.tsx) cannot access the [locale] route param,
 * so <html lang="..."> must be set dynamically. This client component runs on
 * mount and whenever the locale changes, updating the document element.
 */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale as Locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
