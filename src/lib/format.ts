/**
 * Format a minor-unit amount (e.g., pence, cents) as a currency string.
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param minorUnits - Amount in the currency's smallest unit (e.g., 500 pence = £5)
 * @param currencyCode - ISO 4217 currency code (e.g., 'GBP', 'USD', 'EUR')
 * @param locale - BCP 47 locale string (e.g., 'en-GB', 'ja-JP'). Defaults to 'en-GB'.
 */
export function formatCurrency(
  minorUnits: number,
  currencyCode: string = 'GBP',
  locale: string = 'en-GB',
): string {
  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const majorUnits = fractionDigits === 0 ? minorUnits : minorUnits / Math.pow(10, fractionDigits);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: majorUnits % 1 === 0 ? 0 : fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(majorUnits);
}

/**
 * Get the number of decimal places for a currency.
 * Zero-decimal currencies (JPY, KRW, VND, etc.) return 0.
 * Three-decimal currencies (BHD, KWD, OMR) return 3.
 * Most currencies return 2.
 */
export function getCurrencyFractionDigits(currencyCode: string): number {
  // Use Intl to determine the standard fraction digits for this currency
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions();
    return parts.minimumFractionDigits ?? 2;
  } catch {
    return 2; // Default for unknown currencies
  }
}

/**
 * Legacy GBP-only formatter. Kept for backward compatibility.
 * Prefer formatCurrency() for new code.
 */
export function formatPence(pence: number): string {
  return formatCurrency(pence, 'GBP', 'en-GB');
}

/**
 * Format a date as a locale-aware relative time string (e.g., "5 minutes ago", "il y a 3 heures").
 * Uses Intl.RelativeTimeFormat for proper i18n support.
 *
 * @param dateStr - ISO 8601 date string
 * @param locale - BCP 47 locale string (e.g., 'en', 'fr', 'ja')
 */
export function formatRelativeTime(dateStr: string, locale: string = 'en'): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });

  if (diffSecs < 60) return rtf.format(-diffSecs, 'second');
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return rtf.format(-diffMins, 'minute');
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.floor(diffHours / 24);
  return rtf.format(-diffDays, 'day');
}
