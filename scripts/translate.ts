/**
 * API-based translation pipeline for Quiet Riots.
 *
 * Translates entity sections in translation JSON files using the Anthropic API.
 * Sends all 44 locale requests in parallel for speed (~1-2 minutes total).
 *
 * Usage:
 *   # Translate a specific section (e.g. after adding new entity data):
 *   npx tsx scripts/translate.ts --section category_assistants
 *
 *   # Translate all sections (full retranslation):
 *   npx tsx scripts/translate.ts --all
 *
 *   # Translate specific locales only:
 *   npx tsx scripts/translate.ts --section issues --locales es,fr,de
 *
 *   # Dry run (show what would be translated without writing):
 *   npx tsx scripts/translate.ts --section category_assistants --dry-run
 *
 *   # Use a specific model (default: claude-haiku-4-20250414):
 *   npx tsx scripts/translate.ts --section issues --model claude-sonnet-4-20250514
 *
 * Environment:
 *   Requires ANTHROPIC_API_KEY to be set (reads from environment).
 *
 * How it works:
 *   1. Reads the English baseline from translations/en.json
 *   2. For each target locale, sends the English JSON to Claude with translation instructions
 *   3. Parses the response as JSON and merges it into the locale file
 *   4. Validates the result is valid JSON before writing
 *
 * Concurrency is limited to 10 parallel requests to avoid rate limits.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists (tsx doesn't auto-load it)
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

const ALL_LOCALES = [
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
];

const VALID_SECTIONS = [
  'categories',
  'issues',
  'organisations',
  'synonyms',
  'category_assistants',
] as const;

type Section = (typeof VALID_SECTIONS)[number];

// Locale display names for better prompts
const LOCALE_NAMES: Record<string, string> = {
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

// ─── CLI parsing ────────────────────────────────────────────────────────────

interface CliArgs {
  sections: Section[];
  locales: string[];
  dryRun: boolean;
  model: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let sections: Section[] = [];
  let locales = ALL_LOCALES;
  let dryRun = false;
  let model = 'claude-haiku-4-20250414';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--section':
        const sec = args[++i];
        if (!VALID_SECTIONS.includes(sec as Section)) {
          console.error(`❌ Invalid section: ${sec}. Valid: ${VALID_SECTIONS.join(', ')}`);
          process.exit(1);
        }
        sections.push(sec as Section);
        break;
      case '--all':
        sections = [...VALID_SECTIONS];
        break;
      case '--locales':
        locales = args[++i].split(',').map((l) => l.trim());
        for (const l of locales) {
          if (!ALL_LOCALES.includes(l)) {
            console.error(`❌ Invalid locale: ${l}`);
            process.exit(1);
          }
        }
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--model':
        model = args[++i];
        break;
      case '--help':
        console.log(`Usage: npx tsx scripts/translate.ts [options]

Options:
  --section <name>    Translate a specific section (can be repeated)
  --all               Translate all sections
  --locales <list>    Comma-separated locale codes (default: all 44)
  --dry-run           Show what would be translated without writing
  --model <name>      Anthropic model to use (default: claude-haiku-4-20250414)
  --help              Show this help

Sections: ${VALID_SECTIONS.join(', ')}

Examples:
  npx tsx scripts/translate.ts --section category_assistants
  npx tsx scripts/translate.ts --all --locales es,fr,de
  npx tsx scripts/translate.ts --section issues --dry-run`);
        process.exit(0);
        break;
      default:
        console.error(`❌ Unknown argument: ${args[i]}. Use --help for usage.`);
        process.exit(1);
    }
  }

  if (sections.length === 0) {
    console.error('❌ No sections specified. Use --section <name> or --all');
    process.exit(1);
  }

  return { sections, locales, dryRun, model };
}

// ─── Translation logic ─────────────────────────────────────────────────────

function buildPrompt(section: string, englishJson: string, locale: string): string {
  const localeName = LOCALE_NAMES[locale] || locale;
  return `Translate the following JSON values from English to ${localeName} (locale code: ${locale}).

RULES — follow these exactly:
1. Translate ONLY the string values. Keep ALL JSON keys exactly as they are in English.
2. Keep these brand names in English: "Quiet Riot", "Quiet Rioters", "Quiet Riots"
3. Keep character/assistant names as-is: Jett, Bex, Pulse, Jin, Spark, Dee, Flow, Nia, Chip, Roz, Cura, Kai, Nest, Liv, Scout, Pip, Link, Taz, Flex, Gem, Shield, Jas, Track, Eve, Sage, Drew, Fern, Ash, Forge, Sam, Glitch, Max
4. Keep UK proper nouns as-is: Avanti, British Gas, Thames Water, Barclays, HSBC, NHS, Ofcom, Ofgem, Ofwat, ORR, FCA, EA, ICO, DPD, Evri, Aviva
5. Keep currency amounts as-is: £47, £340, £4,200, £30k, £40,000, £47,000
6. Keep numbers, percentages, and abbreviations as-is: 200, 400, 18 Mbps, CPI+, FOI, FOS, AI, IPO
7. Keep {variable} placeholders exactly as-is (e.g. {count}, {name})
8. Return ONLY the translated JSON object — no markdown, no explanation, no code fences.
9. The output must be valid JSON that can be parsed with JSON.parse().

JSON to translate:
${englishJson}`;
}

async function translateSection(
  client: Anthropic,
  section: string,
  englishData: Record<string, unknown>,
  locale: string,
  model: string,
): Promise<Record<string, unknown>> {
  const englishJson = JSON.stringify(englishData, null, 2);
  const prompt = buildPrompt(section, englishJson, locale);

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Strip markdown code fences if the model adds them despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error(
      `  ⚠️  Failed to parse JSON for ${locale}/${section}. Raw response (first 200 chars):`,
    );
    console.error(`  ${cleaned.substring(0, 200)}`);
    throw new Error(`Invalid JSON response for ${locale}/${section}`);
  }
}

// ─── Concurrency limiter ────────────────────────────────────────────────────

async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateTranslation(
  original: Record<string, unknown>,
  translated: Record<string, unknown>,
  section: string,
  locale: string,
): string[] {
  const errors: string[] = [];

  const origKeys = Object.keys(original).sort();
  const transKeys = Object.keys(translated).sort();

  if (origKeys.length !== transKeys.length) {
    errors.push(
      `${locale}/${section}: Key count mismatch — expected ${origKeys.length}, got ${transKeys.length}`,
    );
  }

  for (const key of origKeys) {
    if (!(key in translated)) {
      errors.push(`${locale}/${section}: Missing key "${key}"`);
    }
  }

  for (const key of transKeys) {
    if (!(key in original)) {
      errors.push(`${locale}/${section}: Extra key "${key}"`);
    }
  }

  return errors;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { sections, locales, dryRun, model } = parseArgs();

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required.');
    console.error('   Set it in your environment or .env.local');
    process.exit(1);
  }

  const client = dryRun ? (null as unknown as Anthropic) : new Anthropic();

  // Load English baseline
  const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error('❌ translations/en.json not found. Run seed-translations.ts --generate first.');
    process.exit(1);
  }
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  console.log(`\n🌍 Quiet Riots Translation Pipeline`);
  console.log(`   Model: ${model}`);
  console.log(`   Sections: ${sections.join(', ')}`);
  console.log(
    `   Locales: ${locales.length} (${locales.slice(0, 5).join(', ')}${locales.length > 5 ? '...' : ''})`,
  );
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  const allErrors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const section of sections) {
    const englishSection = enData[section];
    if (!englishSection) {
      console.error(`❌ Section "${section}" not found in en.json. Skipping.`);
      continue;
    }

    const keyCount = Object.keys(englishSection).length;
    const valueCount = Object.values(englishSection).reduce((sum: number, val) => {
      return sum + (typeof val === 'object' && val !== null ? Object.keys(val).length : 1);
    }, 0);

    console.log(`📦 Section: ${section} (${keyCount} entries, ~${valueCount} strings)`);

    if (dryRun) {
      console.log(`   Would translate to ${locales.length} locales. Skipping (dry run).\n`);
      continue;
    }

    const startTime = Date.now();

    await withConcurrency(locales, 10, async (locale) => {
      const localePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);

      try {
        // Read existing locale file
        let localeData: Record<string, unknown> = {};
        if (fs.existsSync(localePath)) {
          localeData = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
        }

        // Translate
        const translated = await translateSection(
          client,
          section,
          englishSection as Record<string, unknown>,
          locale,
          model,
        );

        // Validate
        const errors = validateTranslation(
          englishSection as Record<string, unknown>,
          translated,
          section,
          locale,
        );
        if (errors.length > 0) {
          allErrors.push(...errors);
          console.log(`   ⚠️  ${locale}: ${errors.length} validation warning(s)`);
        }

        // Merge into locale file
        localeData[section] = translated;

        // Write back
        const json = JSON.stringify(localeData, null, 2) + '\n';
        // Final validation — make sure it parses
        JSON.parse(json);
        fs.writeFileSync(localePath, json);

        successCount++;
        process.stdout.write(`   ✅ ${locale} `);
      } catch (err) {
        errorCount++;
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`   ❌ ${locale}: ${msg}`);
        allErrors.push(`${locale}/${section}: ${msg}`);
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n   ⏱  ${elapsed}s for ${locales.length} locales\n`);
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(
    `✅ Success: ${successCount}  ⚠️  Warnings: ${allErrors.length}  ❌ Errors: ${errorCount}`,
  );

  if (allErrors.length > 0) {
    console.log(`\nWarnings/Errors:`);
    for (const err of allErrors) {
      console.log(`  - ${err}`);
    }
  }

  if (errorCount > 0) {
    console.log(`\n💡 Re-run with --locales for failed locales to retry.`);
    process.exit(1);
  }

  console.log(`\n💡 Next steps:`);
  console.log(
    `   1. Verify: for f in translations/*.json; do node -e "require('./$f')" 2>&1 || echo "BROKEN: $f"; done`,
  );
  console.log(`   2. Apply to DB: npx tsx scripts/seed-translations.ts --apply`);
  console.log();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
