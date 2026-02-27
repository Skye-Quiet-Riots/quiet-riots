import { describe, it, expect } from 'vitest';
import { routing, rtlLocales } from './routing';
import type { Locale } from './routing';
import {
  ALL_LOCALES,
  NON_EN_LOCALES,
  LANGUAGES,
  LOCALE_NAMES,
  NATIVE_LOCALE_NAMES,
  isValidLocale,
} from './locales';

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

describe('locales.ts — single source of truth', () => {
  it('ALL_LOCALES has no duplicates', () => {
    const unique = new Set(ALL_LOCALES);
    expect(unique.size).toBe(ALL_LOCALES.length);
  });

  it('NON_EN_LOCALES count equals ALL_LOCALES count minus 1', () => {
    expect(NON_EN_LOCALES.length).toBe(ALL_LOCALES.length - 1);
  });

  it('NON_EN_LOCALES matches ALL_LOCALES minus en (sync check)', () => {
    const filtered = ALL_LOCALES.filter((l) => l !== 'en');
    expect([...NON_EN_LOCALES]).toEqual(filtered);
  });

  it('NON_EN_LOCALES does not include English', () => {
    expect(NON_EN_LOCALES).not.toContain('en');
  });

  it('LANGUAGES array length matches ALL_LOCALES length', () => {
    expect(LANGUAGES.length).toBe(ALL_LOCALES.length);
  });

  it('every code in LANGUAGES is in ALL_LOCALES (no stale entries)', () => {
    const allSet = new Set<string>(ALL_LOCALES);
    for (const [code] of LANGUAGES) {
      expect(allSet.has(code)).toBe(true);
    }
  });

  it('every locale in ALL_LOCALES has an entry in NATIVE_LOCALE_NAMES', () => {
    for (const locale of ALL_LOCALES) {
      expect(NATIVE_LOCALE_NAMES[locale]).toBeDefined();
    }
  });

  it('every locale in NON_EN_LOCALES has an entry in LOCALE_NAMES', () => {
    for (const locale of NON_EN_LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeDefined();
    }
  });
});

describe('isValidLocale', () => {
  it('accepts valid locale codes', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('fr')).toBe(true);
    expect(isValidLocale('zh-CN')).toBe(true);
    expect(isValidLocale('pt-BR')).toBe(true);
  });

  it('rejects invalid locale codes', () => {
    expect(isValidLocale('xyz')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('../../etc')).toBe(false);
    expect(isValidLocale('EN')).toBe(false); // case sensitive
    expect(isValidLocale('english')).toBe(false);
  });
});
