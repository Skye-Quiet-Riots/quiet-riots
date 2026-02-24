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
