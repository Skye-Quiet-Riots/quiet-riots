/**
 * Single source of truth for all supported locales.
 *
 * Every file that needs locale lists, validation, or display names imports from here.
 * Adding a new locale = editing this file only (plus generating translation files).
 */

import { z } from 'zod';

// ─── Locale Arrays ──────────────────────────────────────────────────────────

/** All supported locales (including English). */
export const ALL_LOCALES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'pt-BR',
  'it',
  'nl',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'cs',
  'sk',
  'hu',
  'ro',
  'bg',
  'hr',
  'sl',
  'uk',
  'ru',
  'tr',
  'ar',
  'he',
  'fa',
  'hi',
  'bn',
  'ta',
  'te',
  'ml',
  'th',
  'vi',
  'id',
  'ms',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'tl',
  'sw',
  'el',
  'ca',
  'eu',
  'gl',
] as const;

/**
 * Non-English locales for translation pipelines.
 *
 * Explicit `as const` array (NOT derived via .filter()) to preserve the tuple
 * type needed by z.enum(). A sync test verifies this matches ALL_LOCALES minus 'en'.
 */
export const NON_EN_LOCALES = [
  'es',
  'fr',
  'de',
  'pt',
  'pt-BR',
  'it',
  'nl',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'cs',
  'sk',
  'hu',
  'ro',
  'bg',
  'hr',
  'sl',
  'uk',
  'ru',
  'tr',
  'ar',
  'he',
  'fa',
  'hi',
  'bn',
  'ta',
  'te',
  'ml',
  'th',
  'vi',
  'id',
  'ms',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'tl',
  'sw',
  'el',
  'ca',
  'eu',
  'gl',
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = (typeof ALL_LOCALES)[number];
export type NonEnLocale = (typeof NON_EN_LOCALES)[number];

// ─── RTL Detection ──────────────────────────────────────────────────────────

/** RTL locales — only native-script Arabic, Hebrew, Farsi. Romanised variants are LTR. */
export const RTL_LOCALES = new Set<Locale>(['ar', 'he', 'fa']);

// ─── Validation ─────────────────────────────────────────────────────────────

/** O(1) Set lookup for locale validation. */
const LOCALE_SET = new Set<string>(ALL_LOCALES);

/** Check if a string is a valid locale code. */
export function isValidLocale(code: string): code is Locale {
  return LOCALE_SET.has(code);
}

/** Pre-built Zod schema for non-English locale validation. Centralizes the as-unknown cast. */
export const nonEnLocaleSchema = z.enum(
  NON_EN_LOCALES as unknown as [string, ...string[]],
);

// ─── Display Names ──────────────────────────────────────────────────────────

/** English display names for translation prompts (used by scripts/translate.ts). */
export const LOCALE_NAMES: Record<string, string> = {
  ar: 'Arabic',
  bg: 'Bulgarian',
  bn: 'Bengali',
  ca: 'Catalan',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  es: 'Spanish',
  eu: 'Basque',
  fa: 'Persian/Farsi',
  fi: 'Finnish',
  fr: 'French',
  gl: 'Galician',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ml: 'Malayalam',
  ms: 'Malay',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese (Portugal)',
  'pt-BR': 'Portuguese (Brazil)',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tl: 'Filipino/Tagalog',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
};

/** Native language names for UI display (language selector dropdown). */
export const NATIVE_LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  nl: 'Nederlands',
  sv: 'Svenska',
  da: 'Dansk',
  no: 'Norsk',
  fi: 'Suomi',
  pl: 'Polski',
  cs: 'Čeština',
  sk: 'Slovenčina',
  hu: 'Magyar',
  ro: 'Română',
  bg: 'Български',
  hr: 'Hrvatski',
  sl: 'Slovenščina',
  uk: 'Українська',
  ru: 'Русский',
  tr: 'Türkçe',
  ar: 'العربية',
  he: 'עברית',
  fa: 'فارسی',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  ml: 'മലയാളം',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  tl: 'Filipino',
  sw: 'Kiswahili',
  el: 'Ελληνικά',
  ca: 'Català',
  eu: 'Euskara',
  gl: 'Galego',
};

// ─── DB Seeding ─────────────────────────────────────────────────────────────

/** Language metadata for DB seeding. [code, englishName, nativeName, direction] */
export const LANGUAGES: [string, string, string, 'ltr' | 'rtl'][] = [
  ['en', 'English', 'English', 'ltr'],
  ['es', 'Spanish', 'Español', 'ltr'],
  ['fr', 'French', 'Français', 'ltr'],
  ['de', 'German', 'Deutsch', 'ltr'],
  ['pt', 'Portuguese', 'Português', 'ltr'],
  ['pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', 'ltr'],
  ['it', 'Italian', 'Italiano', 'ltr'],
  ['nl', 'Dutch', 'Nederlands', 'ltr'],
  ['sv', 'Swedish', 'Svenska', 'ltr'],
  ['da', 'Danish', 'Dansk', 'ltr'],
  ['no', 'Norwegian', 'Norsk', 'ltr'],
  ['fi', 'Finnish', 'Suomi', 'ltr'],
  ['pl', 'Polish', 'Polski', 'ltr'],
  ['cs', 'Czech', 'Čeština', 'ltr'],
  ['sk', 'Slovak', 'Slovenčina', 'ltr'],
  ['hu', 'Hungarian', 'Magyar', 'ltr'],
  ['ro', 'Romanian', 'Română', 'ltr'],
  ['bg', 'Bulgarian', 'Български', 'ltr'],
  ['hr', 'Croatian', 'Hrvatski', 'ltr'],
  ['sl', 'Slovenian', 'Slovenščina', 'ltr'],
  ['uk', 'Ukrainian', 'Українська', 'ltr'],
  ['ru', 'Russian', 'Русский', 'ltr'],
  ['tr', 'Turkish', 'Türkçe', 'ltr'],
  ['ar', 'Arabic', 'العربية', 'rtl'],
  ['he', 'Hebrew', 'עברית', 'rtl'],
  ['fa', 'Persian', 'فارسی', 'rtl'],
  ['hi', 'Hindi', 'हिन्दी', 'ltr'],
  ['bn', 'Bengali', 'বাংলা', 'ltr'],
  ['ta', 'Tamil', 'தமிழ்', 'ltr'],
  ['te', 'Telugu', 'తెలుగు', 'ltr'],
  ['ml', 'Malayalam', 'മലയാളം', 'ltr'],
  ['th', 'Thai', 'ไทย', 'ltr'],
  ['vi', 'Vietnamese', 'Tiếng Việt', 'ltr'],
  ['id', 'Indonesian', 'Bahasa Indonesia', 'ltr'],
  ['ms', 'Malay', 'Bahasa Melayu', 'ltr'],
  ['zh-CN', 'Chinese (Simplified)', '简体中文', 'ltr'],
  ['zh-TW', 'Chinese (Traditional)', '繁體中文', 'ltr'],
  ['ja', 'Japanese', '日本語', 'ltr'],
  ['ko', 'Korean', '한국어', 'ltr'],
  ['tl', 'Filipino', 'Filipino', 'ltr'],
  ['sw', 'Swahili', 'Kiswahili', 'ltr'],
  ['el', 'Greek', 'Ελληνικά', 'ltr'],
  ['ca', 'Catalan', 'Català', 'ltr'],
  ['eu', 'Basque', 'Euskara', 'ltr'],
  ['gl', 'Galician', 'Galego', 'ltr'],
];
