/**
 * Generate locale message files for all supported languages.
 *
 * Uses Google Cloud Translation API v2 to translate messages/en.json
 * into all 44 non-English locales defined in src/i18n/routing.ts.
 *
 * Usage:
 *   # With API key (recommended — produces real translations):
 *   GOOGLE_TRANSLATE_API_KEY=xxx npx tsx scripts/generate-locale-messages.ts
 *
 *   # Without API key (copies English as placeholder):
 *   npx tsx scripts/generate-locale-messages.ts --copy-english
 *
 *   # Translate specific locales only:
 *   GOOGLE_TRANSLATE_API_KEY=xxx npx tsx scripts/generate-locale-messages.ts --locales es,fr,de
 *
 *   # Skip existing locale files (only generate missing ones):
 *   GOOGLE_TRANSLATE_API_KEY=xxx npx tsx scripts/generate-locale-messages.ts --skip-existing
 *
 * The script preserves ICU MessageFormat syntax ({count, plural, ...}) and
 * HTML tags (<em>), only translating the human-readable text portions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NON_EN_LOCALES } from '../src/i18n/locales';

const MESSAGES_DIR = path.resolve(__dirname, '../messages');
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');

// All non-English locales from the single source of truth
const ALL_LOCALES: string[] = [...NON_EN_LOCALES];

// Google Translate API v2 language codes differ for some locales
const GOOGLE_LANG_MAP: Record<string, string> = {
  'pt-BR': 'pt', // Google uses 'pt' for Brazilian Portuguese too
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  no: 'no', // Google accepts 'no' for Norwegian
  tl: 'tl', // Tagalog/Filipino
};

interface Messages {
  [namespace: string]: {
    [key: string]: string;
  };
}

// ─── ICU/HTML-safe translation ───────────────────────────────────────────────

/**
 * Tokens that should NOT be translated — ICU placeholders, HTML tags, emoji prefixes.
 * We replace them with numbered markers before translation, then restore after.
 */
const PROTECTED_PATTERN = /(\{[^}]+\}|<\/?[a-z][^>]*>|[^\x00-\x7F]{1,2}\s(?=[A-Z]))/g;

function protectTokens(text: string): { cleaned: string; tokens: string[] } {
  const tokens: string[] = [];
  const cleaned = text.replace(PROTECTED_PATTERN, (match) => {
    tokens.push(match);
    return `__T${tokens.length - 1}__`;
  });
  return { cleaned, tokens };
}

function restoreTokens(text: string, tokens: string[]): string {
  return text.replace(/__T(\d+)__/g, (_, idx) => tokens[parseInt(idx)] ?? _);
}

// ─── Google Translate API ────────────────────────────────────────────────────

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

// Rate limit: max 10 concurrent requests to avoid quota issues
let activeRequests = 0;
const MAX_CONCURRENT = 10;

async function waitForSlot(): Promise<void> {
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  if (!API_KEY) throw new Error('GOOGLE_TRANSLATE_API_KEY not set');

  const googleLang = GOOGLE_LANG_MAP[targetLang] ?? targetLang;

  // Google Translate API has a limit of ~128 segments per request.
  // Batch into chunks of 100.
  const results: string[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    await waitForSlot();
    activeRequests++;

    try {
      const response = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: batch,
          source: 'en',
          target: googleLang,
          format: 'text',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google Translate API error (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        data: { translations: { translatedText: string }[] };
      };

      for (const t of data.data.translations) {
        results.push(t.translatedText);
      }
    } finally {
      activeRequests--;
    }
  }

  return results;
}

// ─── Message translation ─────────────────────────────────────────────────────

async function translateMessages(
  enMessages: Messages,
  targetLocale: string,
  useApi: boolean,
): Promise<Messages> {
  // Flatten all strings with their paths
  const entries: { namespace: string; key: string; value: string }[] = [];
  for (const [ns, keys] of Object.entries(enMessages)) {
    for (const [key, value] of Object.entries(keys)) {
      entries.push({ namespace: ns, key, value });
    }
  }

  let translatedValues: string[];

  if (useApi) {
    // Protect ICU tokens and HTML, translate, restore
    const protected_ = entries.map((e) => protectTokens(e.value));
    const textsToTranslate = protected_.map((p) => p.cleaned);

    const rawTranslated = await translateTexts(textsToTranslate, targetLocale);

    translatedValues = rawTranslated.map((text, i) => restoreTokens(text, protected_[i].tokens));
  } else {
    // Copy English as placeholder
    translatedValues = entries.map((e) => e.value);
  }

  // Rebuild nested structure
  const result: Messages = {};
  for (let i = 0; i < entries.length; i++) {
    const { namespace, key } = entries[i];
    if (!result[namespace]) result[namespace] = {};
    result[namespace][key] = translatedValues[i];
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const copyEnglish = args.includes('--copy-english');
  const skipExisting = args.includes('--skip-existing');

  // Parse --locales flag
  const localesIdx = args.indexOf('--locales');
  const targetLocales =
    localesIdx >= 0 && args[localesIdx + 1]
      ? args[localesIdx + 1].split(',').filter((l) => ALL_LOCALES.includes(l))
      : ALL_LOCALES;

  const useApi = !copyEnglish && !!API_KEY;

  if (!useApi && !copyEnglish) {
    console.log(
      '⚠️  No GOOGLE_TRANSLATE_API_KEY set. Use --copy-english to create placeholder files,',
    );
    console.log('   or set the env var for real translations.');
    process.exit(1);
  }

  console.log(`Mode: ${useApi ? '🌐 Google Translate API' : '📋 Copy English (placeholder)'}`);
  console.log(`Locales: ${targetLocales.length} (${targetLocales.join(', ')})`);
  console.log();

  // Read English messages
  const enMessages: Messages = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
  const totalStrings = Object.values(enMessages).reduce(
    (sum, ns) => sum + Object.keys(ns).length,
    0,
  );
  console.log(
    `English source: ${totalStrings} strings across ${Object.keys(enMessages).length} namespaces`,
  );
  console.log();

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const locale of targetLocales) {
    const outPath = path.join(MESSAGES_DIR, `${locale}.json`);

    if (skipExisting && fs.existsSync(outPath)) {
      skipped++;
      continue;
    }

    try {
      const translated = await translateMessages(enMessages, locale, useApi);
      fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + '\n');
      console.log(`✅ ${locale}.json — ${totalStrings} strings`);
      generated++;
    } catch (err) {
      console.error(`❌ ${locale}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  if (!useApi) {
    console.log(
      '\n💡 These are English placeholders. Run with GOOGLE_TRANSLATE_API_KEY for real translations.',
    );
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
