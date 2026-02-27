import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import enMessages from '../../messages/en.json';
import { routing } from './routing';
import { ALL_LOCALES } from './locales';

const MESSAGES_DIR = path.resolve(__dirname, '../../messages');

describe('messages/en.json', () => {
  it('has all required top-level namespaces', () => {
    const expectedNamespaces = [
      'Metadata',
      'Nav',
      'Footer',
      'Home',
      'Issues',
      'IssueDetail',
      'Organisations',
      'OrgDetail',
      'ActionInitiatives',
      'ActionInitiativeDetail',
      'Assistants',
      'AssistantDetail',
      'Wallet',
      'Profile',
      'Auth',
      'AuthGate',
      'Error',
      'GlobalError',
      'NotFound',
      'Cards',
      'Health',
      'Pivot',
      'ActionInitiativeProgress',
      'WalletBalance',
      'Transactions',
      'Activity',
      'Countries',
      'Synonyms',
      'Join',
      'Search',
      'Feed',
      'Actions',
      'Filter',
      'TimeSkill',
      'Reels',
      'TopUp',
      'Pay',
      'Claim',
      'Evidence',
      'ProfileEdit',
      'SignupForm',
    ];

    for (const ns of expectedNamespaces) {
      expect(enMessages).toHaveProperty(ns);
    }
  });

  it('has no empty string values', () => {
    function checkValues(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.length, `${fullPath} should not be empty`).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          checkValues(value as Record<string, unknown>, fullPath);
        }
      }
    }
    checkValues(enMessages);
  });

  it('Nav namespace has all required keys', () => {
    const nav = enMessages.Nav;
    expect(nav).toHaveProperty('issues');
    expect(nav).toHaveProperty('assistants');
    expect(nav).toHaveProperty('organisations');
    expect(nav).toHaveProperty('wallet');
    expect(nav).toHaveProperty('profile');
    expect(nav).toHaveProperty('toggleMenu');
  });

  it('Auth namespace has all required keys', () => {
    const auth = enMessages.Auth;
    expect(auth).toHaveProperty('welcomeBack');
    expect(auth).toHaveProperty('continueGoogle');
    expect(auth).toHaveProperty('continueFacebook');
    expect(auth).toHaveProperty('sendMagicLink');
    expect(auth).toHaveProperty('checkEmail');
    expect(auth).toHaveProperty('signIn');
    expect(auth).toHaveProperty('signUp');
  });
});

describe('locale message files', () => {
  const nonEnLocales = routing.locales.filter((l) => l !== 'en');
  const enNamespaces = Object.keys(enMessages).sort();

  function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null) {
        keys.push(...getKeys(v as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys.sort();
  }

  const enKeys = getKeys(enMessages);

  it('has a JSON file for every configured locale', () => {
    for (const locale of nonEnLocales) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      expect(fs.existsSync(filePath), `Missing messages/${locale}.json`).toBe(true);
    }
  });

  it.each(nonEnLocales)('%s.json has the same namespaces as en.json', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const namespaces = Object.keys(messages).sort();
    expect(namespaces).toEqual(enNamespaces);
  });

  it.each(nonEnLocales)('%s.json has the same keys as en.json', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const localeKeys = getKeys(messages);
    expect(localeKeys).toEqual(enKeys);
  });

  // ─── Empty value checks for non-English locales ───

  it.each(nonEnLocales)('%s.json has no empty string values', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    function checkValues(obj: Record<string, unknown>, keyPath = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = keyPath ? `${keyPath}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.length, `${locale} ${fullPath} should not be empty`).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          checkValues(value as Record<string, unknown>, fullPath);
        }
      }
    }
    checkValues(messages);
  });

  // ─── Translation quality: values should differ from English ───

  function getStringValues(
    obj: Record<string, unknown>,
    prefix = '',
  ): Array<{ path: string; value: string }> {
    const entries: Array<{ path: string; value: string }> = [];
    for (const [k, v] of Object.entries(obj)) {
      const keyPath = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        entries.push({ path: keyPath, value: v });
      } else if (typeof v === 'object' && v !== null) {
        entries.push(...getStringValues(v as Record<string, unknown>, keyPath));
      }
    }
    return entries;
  }

  const enStrings = getStringValues(enMessages);
  // Only check strings longer than 10 chars to avoid false positives on
  // short universal words like "OK", "Email", numbers, or brand names
  const enLongStrings = enStrings.filter((s) => s.value.length > 10);

  // Exclude romanised (-Latn) locales: they use Latin script, so many
  // translations are English loanwords or close transliterations that
  // legitimately match the English text.
  const nonRomanisedLocales = nonEnLocales.filter((l) => !l.endsWith('-Latn'));

  it.each(nonRomanisedLocales)(
    '%s.json has most strings actually translated (not just copied English)',
    (locale) => {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const localeStrings = getStringValues(messages);

      const localeMap = new Map(localeStrings.map((s) => [s.path, s.value]));

      let identical = 0;
      for (const en of enLongStrings) {
        if (localeMap.get(en.path) === en.value) {
          identical++;
        }
      }

      // At most 15% of long strings should be identical to English.
      // Legitimate identical strings include brand names ("Quiet Riots"),
      // technical terms, financial values, and cognates.
      const maxAllowed = Math.ceil(enLongStrings.length * 0.15);
      expect(
        identical,
        `${locale} has ${identical}/${enLongStrings.length} strings identical to English (max ${maxAllowed})`,
      ).toBeLessThanOrEqual(maxAllowed);
    },
  );
});

// ─── Romanised locale content validation ───

describe('romanised locale message files (-Latn)', () => {
  // Map each romanised locale to the native script Unicode ranges it should NOT contain
  const ROMANISED_SCRIPT_RANGES: Record<string, RegExp> = {
    'hi-Latn': /[\u0900-\u097F]/, // Devanagari
    'ar-Latn': /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, // Arabic
    'bn-Latn': /[\u0980-\u09FF]/, // Bengali
    'fa-Latn': /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, // Arabic/Persian
    'ru-Latn': /[\u0400-\u04FF]/, // Cyrillic
    'el-Latn': /[\u0370-\u03FF]/, // Greek
    'ta-Latn': /[\u0B80-\u0BFF]/, // Tamil
    'te-Latn': /[\u0C00-\u0C7F]/, // Telugu
    'ml-Latn': /[\u0D00-\u0D7F]/, // Malayalam
    'uk-Latn': /[\u0400-\u04FF]/, // Cyrillic
    'bg-Latn': /[\u0400-\u04FF]/, // Cyrillic
  };

  const romanisedLocales = ALL_LOCALES.filter((l) => l.endsWith('-Latn'));

  it.each(romanisedLocales)('%s.json contains no native script characters', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const regex = ROMANISED_SCRIPT_RANGES[locale];
    if (!regex) return; // safety: skip if we don't have a range for this locale

    const contaminated: string[] = [];
    function check(obj: Record<string, unknown>, keyPath = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = keyPath ? `${keyPath}.${key}` : key;
        if (typeof value === 'string' && regex.test(value)) {
          contaminated.push(`${fullPath}: ${value.slice(0, 60)}`);
        } else if (typeof value === 'object' && value !== null) {
          check(value as Record<string, unknown>, fullPath);
        }
      }
    }
    check(messages);

    expect(
      contaminated.length,
      `${locale} has ${contaminated.length} strings with native script chars:\n${contaminated.slice(0, 5).join('\n')}`,
    ).toBe(0);
  });
});
