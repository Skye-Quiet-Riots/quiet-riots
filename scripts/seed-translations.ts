/**
 * Seed translated content for database entities (issues, organisations, categories).
 *
 * This script generates translation files and optionally inserts them into the database.
 * Translations are stored in `translations/` directory as JSON files per locale.
 *
 * Usage:
 *   # Generate translation JSON files (no DB access needed):
 *   npx tsx scripts/seed-translations.ts --generate
 *
 *   # Apply translations from JSON files to the database:
 *   npx tsx scripts/seed-translations.ts --apply
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-translations.ts --apply
 *
 *   # Generate for specific locales only:
 *   npx tsx scripts/seed-translations.ts --generate --locales es,fr,de
 *
 *   # Skip existing translation files:
 *   npx tsx scripts/seed-translations.ts --generate --skip-existing
 */

import * as fs from 'fs';
import * as path from 'path';

const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

// All non-English locales from src/i18n/routing.ts
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

// ─── Source content to translate ──────────────────────────────────────────────

/** 16 issue categories used in the issues table CHECK constraint */
export const CATEGORIES = [
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

/** Issue names and descriptions from seed.ts (50 issues) */
export const ISSUES: { name: string; description: string }[] = [
  {
    name: 'Train Cancellations',
    description: 'Trains cancelled or severely delayed with inadequate notice or compensation',
  },
  {
    name: 'Train Ticket Prices',
    description: 'Rail fares too expensive, above-inflation increases, inconsistent pricing',
  },
  {
    name: 'Flight Delays',
    description:
      'Flights delayed or cancelled, poor communication, difficulty claiming compensation',
  },
  {
    name: 'Lost Luggage',
    description: 'Bags not arriving at destination, slow tracking, inadequate compensation',
  },
  {
    name: 'Bus Route Cuts',
    description: 'Routes cancelled, frequency reduced, rural communities losing bus access',
  },
  {
    name: 'Pothole Damage',
    description: 'Potholes damaging vehicles and endangering cyclists, councils slow to repair',
  },
  {
    name: 'Parking Fines',
    description: 'Unfair private parking charges, aggressive enforcement, confusing signage',
  },
  {
    name: 'Fuel Prices',
    description: 'Petrol and diesel prices too high, slow to drop when wholesale falls',
  },
  {
    name: 'Broadband Speed',
    description: 'Internet speeds far below what is advertised and paid for',
  },
  {
    name: 'Mobile Signal Dead Zones',
    description: 'No mobile signal in homes, workplaces, or along transport routes',
  },
  {
    name: 'Price Rises Mid-Contract',
    description: 'Phone, broadband and TV bills increasing during locked contracts',
  },
  {
    name: 'Customer Service Hold Times',
    description: 'Hours on hold waiting to speak to a human being',
  },
  {
    name: 'Difficulty Cancelling Subscriptions',
    description: 'Companies making it deliberately hard to cancel or unsubscribe',
  },
  {
    name: 'Roaming Charges',
    description: 'Unexpected mobile charges when travelling abroad, post-Brexit price rises',
  },
  {
    name: 'Energy Bill Costs',
    description: 'Gas and electricity bills unaffordable, price cap still too high',
  },
  {
    name: 'Inaccurate Energy Bills',
    description: 'Estimated readings wrong, overcharging, billing errors',
  },
  {
    name: 'Water Bill Increases',
    description: 'Water bills rising sharply while service quality declines',
  },
  {
    name: 'Sewage in Rivers',
    description: 'Water companies dumping raw sewage into waterways and beaches',
  },
  {
    name: 'Power Cuts',
    description: 'Electricity supply interruptions, slow restoration, inadequate compensation',
  },
  {
    name: 'Smart Meter Problems',
    description: 'Smart meters not working, losing functionality after switching supplier',
  },
  {
    name: 'Bank Branch Closures',
    description: 'Local bank branches closing, leaving communities without access',
  },
  {
    name: 'Hidden Bank Charges',
    description: 'Unexpected fees for overdrafts, foreign transactions, account maintenance',
  },
  {
    name: 'Fraud and Scam Losses',
    description: 'Banks refusing to reimburse victims of fraud and authorised push payment scams',
  },
  {
    name: 'Insurance Claim Rejections',
    description: 'Claims denied on technicalities after years of paying premiums',
  },
  {
    name: 'Mortgage Rate Shock',
    description: 'Fixed rate ending and moving to much higher variable rate',
  },
  {
    name: 'Overseas Transfer Fees',
    description: 'Excessive fees and poor exchange rates for international money transfers',
  },
  {
    name: 'NHS Waiting Times',
    description: 'Multi-month or multi-year waits for operations and specialist appointments',
  },
  {
    name: 'GP Appointment Access',
    description: 'Cannot get through to book GP appointments, weeks-long waits',
  },
  {
    name: 'Dentist Availability',
    description: 'Impossible to find an NHS dentist accepting new patients',
  },
  {
    name: 'Mental Health Service Waits',
    description: 'Months-long waits for therapy and mental health support',
  },
  {
    name: 'Prescription Costs',
    description: 'Cost per item too high in England, inconsistency across UK nations',
  },
  {
    name: 'Hospital Parking Charges',
    description: 'Paying to park at hospital while sick or visiting sick relatives',
  },
  {
    name: 'Rent Increases',
    description: 'Private rent rising far above inflation, no-fault eviction threat',
  },
  {
    name: 'Council Tax Rises',
    description: 'Annual council tax increases while local services get worse',
  },
  {
    name: 'Noisy Neighbours',
    description: 'Persistent noise disturbance, councils slow to act, affecting mental health',
  },
  {
    name: 'Rubbish Collection Changes',
    description: 'Reduced bin collections, confusing recycling rules, overflowing bins',
  },
  {
    name: 'Planning Permission Abuse',
    description: 'Unwanted developments approved, green belt under threat, community ignored',
  },
  {
    name: 'Damp and Mould in Housing',
    description: 'Landlords and housing associations failing to fix damp and mould',
  },
  {
    name: 'Delivery Problems',
    description: 'Parcels lost, left in rain, marked delivered but not received',
  },
  {
    name: 'Shrinkflation',
    description: 'Products getting smaller while prices stay the same or increase',
  },
  {
    name: 'Refund Difficulties',
    description: 'Companies making returns and refunds unnecessarily difficult',
  },
  {
    name: 'Fake Reviews',
    description: 'Cannot trust online reviews, fake positive reviews misleading consumers',
  },
  {
    name: 'Subscription Traps',
    description: 'Free trials converting to paid without clear consent, hard to cancel',
  },
  {
    name: 'Food Quality Decline',
    description: 'Ready meals worse quality, smaller portions, more additives',
  },
  {
    name: 'Self-Checkout Frustration',
    description: 'Self-service machines unreliable, replacing human staff',
  },
  {
    name: 'Cost of Childcare',
    description: 'Childcare costs prohibitively expensive, limiting ability to work',
  },
  {
    name: 'Student Loan Repayment',
    description: 'Graduates paying back for decades, threshold and interest changes',
  },
  {
    name: 'Dog Fouling',
    description: 'Dog mess in public spaces, parks, and pavements not cleaned up',
  },
  {
    name: 'AI Replacing Jobs',
    description: 'Anxiety about artificial intelligence automating jobs without transition support',
  },
];

/** Organisation names and descriptions from seed.ts (50 orgs) */
export const ORGANISATIONS: { name: string; description: string }[] = [
  { name: 'Avanti West Coast', description: 'UK rail operator serving the West Coast Main Line' },
  { name: 'Southern / Thameslink', description: 'UK rail operator serving London and the south' },
  { name: 'Northern Trains', description: 'UK rail operator serving the north of England' },
  { name: 'CrossCountry', description: 'UK long-distance rail operator' },
  { name: 'TransPennine Express', description: 'UK rail operator serving trans-Pennine routes' },
  { name: 'LNER', description: 'UK rail operator serving the East Coast Main Line' },
  { name: 'Ryanair', description: 'Low-cost European airline' },
  { name: 'EasyJet', description: 'UK-based low-cost airline' },
  { name: 'British Airways', description: 'UK flag carrier airline' },
  { name: 'TUI', description: 'Holiday and travel company' },
  { name: 'BT / EE', description: 'Major UK broadband and mobile provider' },
  { name: 'Virgin Media O2', description: 'UK broadband, TV, and mobile provider' },
  { name: 'Sky', description: 'UK TV, broadband, and mobile provider' },
  { name: 'Vodafone', description: 'Global telecoms company headquartered in the UK' },
  { name: 'Three', description: 'UK mobile network operator' },
  { name: 'TalkTalk', description: 'UK broadband and phone provider' },
  { name: 'British Gas', description: 'UK energy supplier' },
  { name: 'OVO Energy', description: 'UK energy supplier' },
  { name: 'EDF', description: 'UK energy supplier (French-owned)' },
  { name: 'Octopus Energy', description: 'UK renewable energy supplier' },
  { name: 'Scottish Power', description: 'UK energy supplier' },
  { name: 'E.ON', description: 'UK energy supplier (German-owned)' },
  {
    name: 'Thames Water',
    description: 'Water and sewerage company for London and the Thames Valley',
  },
  { name: 'Southern Water', description: 'Water company for the south of England' },
  { name: 'United Utilities', description: 'Water company for the north west of England' },
  { name: 'Severn Trent', description: 'Water company for the Midlands' },
  { name: 'Anglian Water', description: 'Water company for East Anglia' },
  { name: 'Barclays', description: 'British multinational bank' },
  { name: 'HSBC', description: 'Global banking and financial services' },
  { name: 'NatWest', description: 'UK retail and commercial bank' },
  { name: 'Lloyds / Halifax', description: 'UK banking group' },
  { name: 'Santander', description: 'UK bank (Spanish-owned)' },
  { name: 'Revolut', description: 'Digital banking and fintech' },
  { name: 'Aviva', description: 'UK insurance and financial services' },
  { name: 'Admiral', description: 'UK car and home insurance' },
  { name: 'Direct Line', description: 'UK insurance company' },
  { name: 'Amazon', description: 'Global e-commerce and tech' },
  { name: 'Royal Mail', description: 'UK postal service' },
  { name: 'Evri', description: 'UK parcel delivery service (formerly Hermes)' },
  { name: 'DPD', description: 'UK parcel delivery service' },
  { name: 'Tesco', description: 'UK supermarket chain' },
  { name: 'Sainsburys', description: 'UK supermarket chain' },
  { name: 'NHS England', description: 'National Health Service for England' },
  { name: 'NHS Dentistry', description: 'NHS dental services' },
  { name: 'BUPA', description: 'Private healthcare provider' },
  { name: 'Local Councils', description: 'UK local government authorities' },
  { name: 'Persimmon Homes', description: 'UK housebuilder' },
  { name: 'OpenRent', description: 'UK online lettings platform' },
  { name: 'Netflix', description: 'Streaming entertainment service' },
  { name: 'Apple', description: 'Technology company' },
];

// ─── Translation file structure ───────────────────────────────────────────────

export interface TranslationFile {
  locale: string;
  categories: Record<string, string>;
  issues: Record<string, { name: string; description: string }>;
  organisations: Record<string, { name: string; description: string }>;
}

// ─── Generate mode ────────────────────────────────────────────────────────────

function generateEnglishBaseline(): TranslationFile {
  const categories: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    categories[cat] = cat;
  }

  const issues: Record<string, { name: string; description: string }> = {};
  for (const issue of ISSUES) {
    issues[issue.name] = { name: issue.name, description: issue.description };
  }

  const organisations: Record<string, { name: string; description: string }> = {};
  for (const org of ORGANISATIONS) {
    organisations[org.name] = { name: org.name, description: org.description };
  }

  return { locale: 'en', categories, issues, organisations };
}

// ─── Apply mode ───────────────────────────────────────────────────────────────

async function applyTranslations() {
  const { printDbBanner } = await import('./db-safety');
  const env = printDbBanner();

  // Check that translations directory exists
  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error('❌ No translations/ directory found. Run --generate first.');
    process.exit(1);
  }

  // Read all translation files
  const files = fs.readdirSync(TRANSLATIONS_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ No translation JSON files found in translations/. Run --generate first.');
    process.exit(1);
  }

  console.log(`Found ${files.length} translation files`);

  // We need to look up entity IDs from the database
  const { getDb } = await import('../src/lib/db');
  const db = getDb();

  // Build lookup maps: name → id
  const issueResult = await db.execute('SELECT id, name FROM issues');
  const issueIdMap: Record<string, string> = {};
  for (const row of issueResult.rows) {
    issueIdMap[row.name as string] = row.id as string;
  }

  const orgResult = await db.execute('SELECT id, name FROM organisations');
  const orgIdMap: Record<string, string> = {};
  for (const row of orgResult.rows) {
    orgIdMap[row.name as string] = row.id as string;
  }

  console.log(
    `DB has ${Object.keys(issueIdMap).length} issues, ${Object.keys(orgIdMap).length} organisations`,
  );

  const { generateId } = await import('../src/lib/uuid');

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const locale = file.replace('.json', '');
    if (locale === 'en') continue; // Don't store English translations (it's the source language)

    const data: TranslationFile = JSON.parse(
      fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf-8'),
    );

    // Batch all inserts for this locale
    const statements: { sql: string; args: (string | number | null)[] }[] = [];

    // Categories (use category name as entity_id since categories aren't a separate table)
    for (const [englishName, translatedName] of Object.entries(data.categories)) {
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'category', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), englishName, locale, translatedName],
      });
    }

    // Issues
    for (const [englishName, translation] of Object.entries(data.issues)) {
      const issueId = issueIdMap[englishName];
      if (!issueId) {
        skipped++;
        continue;
      }

      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'issue', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), issueId, locale, translation.name],
      });
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'issue', ?, 'description', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), issueId, locale, translation.description],
      });
    }

    // Organisations
    for (const [englishName, translation] of Object.entries(data.organisations)) {
      const orgId = orgIdMap[englishName];
      if (!orgId) {
        skipped++;
        continue;
      }

      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'organisation', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), orgId, locale, translation.name],
      });
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'organisation', ?, 'description', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), orgId, locale, translation.description],
      });
    }

    // Execute batch
    if (statements.length > 0) {
      await db.batch(statements, 'write');
      inserted += statements.length;
      console.log(`✅ ${locale}: ${statements.length} translations`);
    }
  }

  console.log(
    `\nDone: ${inserted} translations inserted/updated, ${skipped} skipped (not found in DB)`,
  );

  if (env.isProduction || env.isStaging) {
    console.log('\n💡 Remember to redeploy Vercel to pick up the new data:');
    console.log('   cd /Users/skye/Projects/quiet-riots && npx vercel --prod');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isGenerate = args.includes('--generate');
  const isApply = args.includes('--apply');
  const skipExisting = args.includes('--skip-existing');

  // Parse --locales flag
  const localesIdx = args.indexOf('--locales');
  const targetLocales =
    localesIdx >= 0 && args[localesIdx + 1]
      ? args[localesIdx + 1].split(',').filter((l) => ALL_LOCALES.includes(l))
      : ALL_LOCALES;

  if (!isGenerate && !isApply) {
    console.log('Usage:');
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate           Generate translation files',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --apply             Apply translations to DB',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate --locales es,fr,de   Specific locales',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate --skip-existing      Skip existing files',
    );
    process.exit(0);
  }

  if (isGenerate) {
    // Ensure translations directory exists
    if (!fs.existsSync(TRANSLATIONS_DIR)) {
      fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
    }

    // Write English baseline
    const baseline = generateEnglishBaseline();
    fs.writeFileSync(
      path.join(TRANSLATIONS_DIR, 'en.json'),
      JSON.stringify(baseline, null, 2) + '\n',
    );
    console.log('✅ en.json (baseline)');

    // Count what we need
    const totalStrings = CATEGORIES.length + ISSUES.length * 2 + ORGANISATIONS.length * 2;
    console.log(
      `\nContent to translate: ${CATEGORIES.length} categories + ${ISSUES.length} issues (name+desc) + ${ORGANISATIONS.length} orgs (name+desc) = ${totalStrings} strings per locale`,
    );
    console.log(`Target locales: ${targetLocales.length}`);
    console.log(`\n⚠️  Translation files need to be generated by translation agents.`);
    console.log(`   This script creates the English baseline. Use Claude sub-agents to translate.`);

    let generated = 0;
    let skippedCount = 0;

    for (const locale of targetLocales) {
      const outPath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      if (skipExisting && fs.existsSync(outPath)) {
        skippedCount++;
        continue;
      }

      // In --generate mode without an API, just create placeholder copies
      // The actual translation is done by Claude sub-agents (see session 26 pattern)
      const placeholder: TranslationFile = {
        locale,
        categories: { ...baseline.categories },
        issues: JSON.parse(JSON.stringify(baseline.issues)),
        organisations: JSON.parse(JSON.stringify(baseline.organisations)),
      };
      fs.writeFileSync(outPath, JSON.stringify(placeholder, null, 2) + '\n');
      generated++;
    }

    console.log(`\nGenerated: ${generated} placeholder files, ${skippedCount} skipped`);
    console.log('💡 Replace placeholder files with real translations using Claude sub-agents.');
  }

  if (isApply) {
    await applyTranslations();
  }
}

// Only run when executed directly (not when imported by tests)
if (
  process.argv[1]?.endsWith('seed-translations.ts') ||
  process.argv[1]?.endsWith('seed-translations')
) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
