/**
 * One-shot script: inject category translations from translations/*.json
 * into messages/*.json under a "Categories" namespace.
 *
 * Usage:
 *   npx tsx scripts/add-category-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.resolve(__dirname, '../messages');
const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

const CATEGORIES = [
  'Transport',
  'Telecoms',
  'Banking',
  'Health',
  'Education',
  'Environment',
  'Energy',
  'Water',
  'Insurance',
  'Housing',
  'Shopping',
  'Delivery',
  'Local',
  'Employment',
  'Tech',
  'Other',
] as const;

function main() {
  // 1. Add English baseline (identity mapping)
  const enPath = path.join(MESSAGES_DIR, 'en.json');
  const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const enCategories: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    enCategories[cat] = cat;
  }
  enMessages.Categories = enCategories;
  fs.writeFileSync(enPath, JSON.stringify(enMessages, null, 2) + '\n');
  console.log('en.json (baseline)');

  // 2. For each non-English locale, read from translations/*.json
  const messageFiles = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'en.json');
  let updated = 0;

  for (const file of messageFiles) {
    const locale = file.replace('.json', '');
    const messagesPath = path.join(MESSAGES_DIR, file);
    const translationsPath = path.join(TRANSLATIONS_DIR, `${locale}.json`);

    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));

    if (fs.existsSync(translationsPath)) {
      const translationData = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
      if (translationData.categories) {
        messages.Categories = translationData.categories;
      } else {
        // Fallback to English if no categories in translation file
        messages.Categories = enCategories;
      }
    } else {
      // No translation file — use English
      messages.Categories = enCategories;
    }

    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2) + '\n');
    updated++;
  }

  console.log(`Updated ${updated} locale message files with Categories namespace`);
}

main();
