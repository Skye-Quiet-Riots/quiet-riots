import { describe, it, expect, vi } from 'vitest';
import { formatPence, formatCurrency, getCurrencyFractionDigits, formatRelativeTime } from './format';

describe('formatPence (legacy)', () => {
  it('formats pence under £1', () => {
    expect(formatPence(50)).toMatch(/0\.50/);
    expect(formatPence(1)).toMatch(/0\.01/);
    expect(formatPence(99)).toMatch(/0\.99/);
  });

  it('formats exact pounds without decimals', () => {
    expect(formatPence(100)).toMatch(/1/);
    expect(formatPence(500)).toMatch(/5/);
    expect(formatPence(10000)).toMatch(/100/);
  });

  it('formats pounds with pence using 2 decimal places', () => {
    expect(formatPence(150)).toMatch(/1\.50/);
    expect(formatPence(1099)).toMatch(/10\.99/);
    expect(formatPence(250)).toMatch(/2\.50/);
  });

  it('formats zero', () => {
    expect(formatPence(0)).toMatch(/0/);
  });
});

describe('formatCurrency', () => {
  it('formats GBP amounts', () => {
    expect(formatCurrency(500, 'GBP', 'en-GB')).toMatch(/£5/);
    expect(formatCurrency(1099, 'GBP', 'en-GB')).toMatch(/£10\.99/);
    expect(formatCurrency(0, 'GBP', 'en-GB')).toMatch(/£0/);
  });

  it('formats USD amounts', () => {
    expect(formatCurrency(500, 'USD', 'en-US')).toMatch(/\$5/);
    expect(formatCurrency(1099, 'USD', 'en-US')).toMatch(/\$10\.99/);
  });

  it('formats EUR amounts', () => {
    const result = formatCurrency(1500, 'EUR', 'de-DE');
    expect(result).toMatch(/15/);
    expect(result).toContain('€');
  });

  it('formats zero-decimal currencies (JPY)', () => {
    // JPY has no minor units — 500 yen is just ¥500
    const result = formatCurrency(500, 'JPY', 'ja-JP');
    expect(result).toMatch(/500/);
    // Node.js Intl may use fullwidth yen sign (￥) or halfwidth (¥)
    expect(result).toMatch(/[¥￥]/);
  });

  it('defaults to GBP and en-GB locale', () => {
    const result = formatCurrency(500);
    expect(result).toMatch(/£5/);
  });
});

describe('getCurrencyFractionDigits', () => {
  it('returns 2 for GBP, USD, EUR', () => {
    expect(getCurrencyFractionDigits('GBP')).toBe(2);
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('EUR')).toBe(2);
  });

  it('returns 0 for JPY, KRW', () => {
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
    expect(getCurrencyFractionDigits('KRW')).toBe(0);
  });

  it('returns 3 for BHD (three-decimal currency)', () => {
    expect(getCurrencyFractionDigits('BHD')).toBe(3);
  });
});

describe('formatRelativeTime', () => {
  it('formats minutes ago in English', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinAgo, 'en');
    expect(result).toMatch(/5/);
    // Intl.RelativeTimeFormat narrow style uses "5m ago" or "5 min. ago"
    expect(result).toMatch(/m/i);
  });

  it('formats hours ago in English', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeHoursAgo, 'en');
    expect(result).toMatch(/3/);
    // Narrow style: "3h ago" or "3 hr. ago"
    expect(result).toMatch(/h/i);
  });

  it('formats days ago in English', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoDaysAgo, 'en');
    expect(result).toMatch(/2/);
    // Narrow style: "2d ago" or "2 days ago"
    expect(result).toMatch(/d/i);
  });

  it('formats in French locale', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinAgo, 'fr');
    // French uses "il y a" or "min" — just check it doesn't say "ago"
    expect(result).not.toContain('ago');
    expect(result).toMatch(/5/);
  });

  it('formats in Japanese locale', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeHoursAgo, 'ja');
    expect(result).toMatch(/3/);
    // Should contain Japanese time unit, not English
    expect(result).not.toContain('ago');
  });

  it('defaults to English when no locale provided', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinAgo);
    expect(result).toMatch(/5/);
  });
});
