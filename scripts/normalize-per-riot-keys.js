#!/usr/bin/env node
/**
 * DEPRECATED: Key normalization is now built into scripts/translate.ts.
 * This script is kept for manual one-off fixes but is no longer part of the pipeline.
 *
 * Normalizes issue_per_riot keys in all non-English translation files
 * to use English issue names (matching en.json).
 *
 * The translate script sometimes produces translated keys
 * (e.g. "Retrasos en Vuelos" instead of "Flight Delays"),
 * which breaks seed-translations --apply since it looks up by English name.
 */
const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '..', 'translations');
const en = JSON.parse(fs.readFileSync(path.join(translationsDir, 'en.json'), 'utf-8'));
const enPerRiot = en.issue_per_riot;
const enKeys = Object.keys(enPerRiot);

const files = fs
  .readdirSync(translationsDir)
  .filter((f) => f.endsWith('.json') && f !== 'en.json');

let totalFixed = 0;
let totalFiles = 0;

for (const file of files) {
  const filePath = path.join(translationsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!data.issue_per_riot) continue;

  const localeKeys = Object.keys(data.issue_per_riot);

  // Build mapping: translated issue name → English issue name
  const translatedToEnglish = {};
  if (data.issues) {
    for (const [enName, tr] of Object.entries(data.issues)) {
      if (tr.name) translatedToEnglish[tr.name] = enName;
    }
  }

  const needsFixing = localeKeys.filter((k) => !enKeys.includes(k));
  if (needsFixing.length === 0) continue;

  // Match each non-English key to an English key
  const newPerRiot = {};
  let fixed = 0;
  let unmatched = 0;

  for (const key of localeKeys) {
    if (enKeys.includes(key)) {
      newPerRiot[key] = data.issue_per_riot[key];
      continue;
    }

    // Try exact match via reverse lookup
    let englishKey = translatedToEnglish[key];

    // If no exact match, try position-based matching
    if (!englishKey) {
      const idx = localeKeys.indexOf(key);
      if (idx < enKeys.length) {
        englishKey = enKeys[idx];
      }
    }

    if (englishKey && enKeys.includes(englishKey)) {
      newPerRiot[englishKey] = data.issue_per_riot[key];
      fixed++;
    } else {
      newPerRiot[key] = data.issue_per_riot[key];
      unmatched++;
      console.log('  UNMATCHED in ' + file + ': ' + key);
    }
  }

  if (fixed > 0) {
    data.issue_per_riot = newPerRiot;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    totalFixed += fixed;
    totalFiles++;
    console.log(
      file +
        ': normalized ' +
        fixed +
        ' keys' +
        (unmatched > 0 ? ', ' + unmatched + ' unmatched' : ''),
    );
  }
}

console.log('\nTotal: ' + totalFixed + ' keys normalized across ' + totalFiles + ' files');
