#!/usr/bin/env node

/**
 * Apply UI translations from a JSON file to all locale message files.
 *
 * Usage:
 *   node scripts/apply-ui-translations.js <translations.json>
 *   node scripts/apply-ui-translations.js --list-locales
 *   node scripts/apply-ui-translations.js --check <translations.json>
 *
 * The translations.json file should contain an object mapping locale codes
 * to objects mapping "Namespace.key" to translated values:
 *   { "es": { "BotMessages.suggestionApproved": "..." }, ... }
 *
 * Flags:
 *   --list-locales   Print the exact locale list for use in translation prompts
 *   --check          Validate translations without applying them
 *   --dry-run        Show what would change without writing files
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

// Derive the canonical locale list from actual message files (minus en.json)
function getExpectedLocales() {
  return fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'en.json')
    .map((f) => f.replace('.json', ''))
    .sort();
}

// --list-locales: print the locale list for prompts
if (process.argv.includes('--list-locales')) {
  const locales = getExpectedLocales();
  console.log(`${locales.length} non-English locales:\n`);
  console.log(locales.join(', '));
  process.exit(0);
}

// Require a translations file argument
const translationsArg = process.argv.find((a) => a.endsWith('.json'));
if (!translationsArg) {
  console.error('Usage: node scripts/apply-ui-translations.js <translations.json>');
  console.error('       node scripts/apply-ui-translations.js --list-locales');
  process.exit(1);
}

const checkOnly = process.argv.includes('--check');
const dryRun = process.argv.includes('--dry-run');

// Load translations
let translations;
try {
  translations = JSON.parse(fs.readFileSync(translationsArg, 'utf8'));
} catch (e) {
  console.error(`Failed to parse ${translationsArg}: ${e.message}`);
  process.exit(1);
}

const expectedLocales = getExpectedLocales();
const providedLocales = Object.keys(translations).sort();

// Validate: check for missing and unexpected locales
const missing = expectedLocales.filter((l) => !providedLocales.includes(l));
const unexpected = providedLocales.filter((l) => !expectedLocales.includes(l));

if (unexpected.length > 0) {
  console.error(`\n❌ UNEXPECTED locales (not in messages/ directory):`);
  console.error(`   ${unexpected.join(', ')}`);
  console.error(`   These will be SKIPPED.`);
}

if (missing.length > 0) {
  console.error(`\n⚠️  MISSING locales (exist in messages/ but not in translations):`);
  console.error(`   ${missing.join(', ')}`);
  console.error(`   These locale files will NOT be updated.`);
}

if (checkOnly) {
  if (missing.length === 0 && unexpected.length === 0) {
    console.log('✅ All locales match exactly.');
    process.exit(0);
  }
  process.exit(1);
}

// Apply translations
let updated = 0;
let skipped = 0;
const errors = [];

for (const locale of expectedLocales) {
  if (!translations[locale]) {
    skipped++;
    continue;
  }

  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    errors.push(`Failed to read ${locale}.json: ${e.message}`);
    continue;
  }

  const localeTranslations = translations[locale];
  let keysApplied = 0;

  for (const [fullKey, value] of Object.entries(localeTranslations)) {
    // Support both "Namespace.key" and plain "key" formats
    const dotIndex = fullKey.indexOf('.');
    let namespace, key;
    if (dotIndex > 0) {
      namespace = fullKey.substring(0, dotIndex);
      key = fullKey.substring(dotIndex + 1);
    } else {
      // If no namespace prefix, try to find the key in existing namespaces
      let found = false;
      for (const [ns, keys] of Object.entries(data)) {
        if (typeof keys === 'object' && keys !== null && fullKey in keys) {
          namespace = ns;
          key = fullKey;
          found = true;
          break;
        }
      }
      if (!found) {
        // Check en.json to find the namespace
        const enData = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf8'));
        for (const [ns, keys] of Object.entries(enData)) {
          if (typeof keys === 'object' && keys !== null && fullKey in keys) {
            namespace = ns;
            key = fullKey;
            found = true;
            break;
          }
        }
        if (!found) {
          errors.push(`${locale}: key "${fullKey}" not found in any namespace`);
          continue;
        }
      }
    }

    if (!data[namespace]) {
      data[namespace] = {};
    }
    data[namespace][key] = value;
    keysApplied++;
  }

  if (keysApplied > 0) {
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
    updated++;
  }
}

console.log(`\n📊 Results:`);
console.log(`   Updated: ${updated} locale files`);
console.log(`   Skipped: ${skipped} (no translations provided)`);
if (unexpected.length > 0) console.log(`   Ignored: ${unexpected.length} unexpected locales`);
if (errors.length > 0) {
  console.log(`   Errors: ${errors.length}`);
  errors.forEach((e) => console.log(`   - ${e}`));
}
if (dryRun) console.log(`   (dry run — no files written)`);

// Final validation: verify all JSON files are valid
if (!dryRun) {
  let broken = 0;
  for (const locale of expectedLocales) {
    try {
      JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), 'utf8'));
    } catch {
      console.error(`❌ BROKEN JSON: ${locale}.json`);
      broken++;
    }
  }
  if (broken === 0) {
    console.log(`\n✅ All ${expectedLocales.length} locale files are valid JSON.`);
  }
}

process.exit(missing.length > 0 ? 1 : 0);
