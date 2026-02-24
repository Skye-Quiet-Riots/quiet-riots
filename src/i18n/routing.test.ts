import { describe, it, expect } from 'vitest';
import { routing, rtlLocales } from './routing';
import type { Locale } from './routing';

describe('routing', () => {
  it('has en as default locale', () => {
    expect(routing.defaultLocale).toBe('en');
  });

  it('includes all major social platform languages', () => {
    const expected = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi', 'zh-CN'];
    for (const locale of expected) {
      expect(routing.locales).toContain(locale);
    }
  });

  it('includes 45 locales', () => {
    expect(routing.locales.length).toBe(45);
  });

  it('has no duplicate locales', () => {
    const unique = new Set(routing.locales);
    expect(unique.size).toBe(routing.locales.length);
  });
});

describe('rtlLocales', () => {
  it('contains Arabic, Hebrew, and Farsi', () => {
    expect(rtlLocales.has('ar' as Locale)).toBe(true);
    expect(rtlLocales.has('he' as Locale)).toBe(true);
    expect(rtlLocales.has('fa' as Locale)).toBe(true);
  });

  it('does not contain LTR languages', () => {
    expect(rtlLocales.has('en' as Locale)).toBe(false);
    expect(rtlLocales.has('fr' as Locale)).toBe(false);
    expect(rtlLocales.has('ja' as Locale)).toBe(false);
  });

  it('has exactly 3 RTL locales', () => {
    expect(rtlLocales.size).toBe(3);
  });
});
