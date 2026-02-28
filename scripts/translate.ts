/**
 * API-based translation pipeline for Quiet Riots.
 *
 * Translates entity sections in translation JSON files using the Anthropic API.
 * Sends all locale requests in parallel for speed (~1-2 minutes total).
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
 *   # Use a specific model (default: claude-haiku-4-5-20251001):
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
import { NON_EN_LOCALES, LOCALE_NAMES } from '../src/i18n/locales';
import { validateTranslation } from './translate-validation';

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

// All non-English locales from the single source of truth
const ALL_LOCALES: string[] = [...NON_EN_LOCALES];

const VALID_SECTIONS = [
  'categories',
  'issues',
  'organisations',
  'synonyms',
  'category_assistants',
  'actions',
  'expert_profiles',
  'riot_reels',
  'action_initiatives',
  'issue_per_riot',
] as const;

type Section = (typeof VALID_SECTIONS)[number];

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
  let model = 'claude-haiku-4-5-20251001';

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
  --locales <list>    Comma-separated locale codes (default: all 55)
  --dry-run           Show what would be translated without writing
  --model <name>      Anthropic model to use (default: claude-haiku-4-5-20251001)
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
  let prompt = `Translate the following JSON values from English to ${localeName} (locale code: ${locale}).

RULES — follow these exactly:
1. Translate ONLY the string values. Keep ALL JSON keys exactly as they are in English.
2. IMPORTANT: The "name" field values inside issues and organisations ARE user-facing display names — you MUST translate them into ${localeName}. They look the same as the JSON keys but they are NOT lookup keys — they are what users see on screen. For example, "Train Cancellations" as a name value should become the ${localeName} equivalent, NOT stay as "Train Cancellations".
3. Keep these brand names in English: "Quiet Riot", "Quiet Rioters", "Quiet Riots"
4. Keep character/assistant names as-is: Jett, Bex, Pulse, Jin, Spark, Dee, Flow, Nia, Chip, Roz, Cura, Kai, Nest, Liv, Scout, Pip, Link, Taz, Flex, Gem, Shield, Jas, Track, Eve, Sage, Drew, Fern, Ash, Forge, Sam, Glitch, Max
5. Keep UK proper nouns as-is: Avanti, British Gas, Thames Water, Barclays, HSBC, NHS, Ofcom, Ofgem, Ofwat, ORR, FCA, EA, ICO, DPD, Evri, Aviva
6. Keep currency amounts as-is: £47, £340, £4,200, £30k, £40,000, £47,000
7. Keep numbers, percentages, and abbreviations as-is: 200, 400, 18 Mbps, CPI+, FOI, FOS, AI, IPO
8. Keep {variable} placeholders exactly as-is (e.g. {count}, {name})
9. Return ONLY the translated JSON object — no markdown, no explanation, no code fences.
10. The output must be valid JSON that can be parsed with JSON.parse().`;

  // Romanised locale: enforce Latin script only
  if (locale.endsWith('-Latn')) {
    prompt += `

CRITICAL — LATIN SCRIPT ONLY:
- Do NOT use any native script characters (no Bengali, Devanagari, Arabic, Cyrillic, Greek, Tamil, Telugu, Malayalam)
- Use Latin alphabet ONLY — this is a romanised variant for people who type in Latin script
- Follow real-world conventions, not academic transliteration
- For Arabizi: use numeral conventions (3=ع, 7=ح, 5=خ, 2=ء, 8=ق, 9=ص)
- For Hinglish: mix Hindi and English words naturally as speakers do
- For Finglish: use established Persian romanisation conventions`;
  }

  prompt += `

JSON to translate:
${englishJson}`;

  return prompt;
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

// Validation imported from ./translate-validation

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
