import { defineRouting } from 'next-intl/routing';
import { ALL_LOCALES, RTL_LOCALES } from './locales';

export type { Locale } from './locales';

export const routing = defineRouting({
  locales: ALL_LOCALES,
  defaultLocale: 'en',
});

/** RTL locales — Arabic, Hebrew, Farsi. Re-exported from locales.ts. */
export const rtlLocales = RTL_LOCALES;
