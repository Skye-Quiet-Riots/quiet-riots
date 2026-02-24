import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import enMessages from '../../messages/en.json';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // For English (default), use the statically imported messages.
  // For other locales, try to load from messages/{locale}.json, fall back to English.
  // Until machine translations are generated, all locales fall back to English.
  let messages = enMessages;
  if (locale !== 'en') {
    try {
      messages = (await import(`../../messages/${locale}.json`)).default;
    } catch {
      // Locale file not yet translated — use English
    }
  }

  return {
    locale,
    messages,
  };
});
