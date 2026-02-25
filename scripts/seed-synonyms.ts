/**
 * Add search synonyms for all issues.
 *
 * Safe to run multiple times — skips existing synonyms (matches by issue_id + term).
 * Does NOT drop or modify existing data.
 *
 * Usage:
 *   bash scripts/with-staging-env.sh scripts/seed-synonyms.ts
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-synonyms.ts
 */

import { getDb } from '../src/lib/db';
import { printDbBanner, requireRemoteDb } from './db-safety';
import { generateId } from '../src/lib/uuid';

// ─── Synonym definitions: [issueName, [synonym terms]] ───────────────────────
const SYNONYMS: [string, string[]][] = [
  [
    'Train Cancellations',
    [
      'train cancelled',
      'cancelled train',
      'train cancellation',
      'trains not running',
      'rail cancellation',
      'service cancelled',
      'train delays',
      'delayed train',
      'trains late',
      'late train',
      'rail delays',
    ],
  ],
  ['Train Ticket Prices', ['rail fares', 'ticket costs', 'expensive trains', 'train fares']],
  [
    'Flight Delays',
    [
      'flight delayed',
      'plane delayed',
      'flight cancelled',
      'airport delays',
      'stuck at airport',
      'flight late',
    ],
  ],
  [
    'Lost Luggage',
    [
      'missing bags',
      'lost suitcase',
      'bags not arrived',
      'missing suitcase',
      'luggage not on carousel',
      'bag lost by airline',
    ],
  ],
  ['Bus Route Cuts', ['bus cuts', 'route reductions', 'bus service closures']],
  [
    'Broadband Speed',
    [
      'slow internet',
      'slow wifi',
      'wifi slow',
      'internet speed',
      'broadband not working',
      'buffering',
      'internet keeps dropping',
      'wifi dropping out',
    ],
  ],
  [
    'Mobile Signal Dead Zones',
    ['no signal', 'no reception', 'mobile blackspot', 'signal dead zone'],
  ],
  [
    'Price Rises Mid-Contract',
    ['bill increase mid contract', 'contract price rise', 'mid contract hike'],
  ],
  [
    'Customer Service Hold Times',
    [
      'on hold',
      'waiting on phone',
      'cant get through',
      'no one answering',
      'phone queue',
      'call centre',
    ],
  ],
  [
    'Difficulty Cancelling Subscriptions',
    ['cant cancel', 'hard to cancel', 'cancel subscription', 'unsubscribe'],
  ],
  [
    'Energy Bill Costs',
    [
      'gas bill too high',
      'electricity bill',
      'energy prices',
      'heating costs',
      'fuel poverty',
      'cant afford energy',
    ],
  ],
  [
    'Inaccurate Energy Bills',
    ['wrong energy bill', 'estimated reading wrong', 'overcharged energy'],
  ],
  ['Water Bill Increases', ['water rates', 'water charge', 'water bill too high']],
  [
    'Sewage in Rivers',
    [
      'sewage dumping',
      'raw sewage',
      'sewage on beach',
      'water pollution',
      'sewage overflow',
      'combined sewer overflow',
    ],
  ],
  [
    'Hidden Bank Charges',
    ['unexpected fees', 'hidden fees', 'surprise charges', 'overdraft charges', 'bank fees'],
  ],
  ['Fraud and Scam Losses', ['scammed', 'bank fraud', 'push payment scam', 'authorised fraud']],
  ['Bank Branch Closures', ['branch shutdowns', 'local bank closing', 'no bank nearby']],
  ['Insurance Claim Rejections', ['claim denied', 'insurance wont pay', 'rejected claim']],
  [
    'NHS Waiting Times',
    [
      'NHS wait',
      'waiting list',
      'operation wait',
      'hospital waiting time',
      'referral wait',
      'waiting for surgery',
    ],
  ],
  [
    'GP Appointment Access',
    [
      'cant get GP appointment',
      'doctor appointment',
      'GP phone queue',
      'cant see a doctor',
      '8am phone scramble',
    ],
  ],
  ['Dentist Availability', ['NHS dentist', 'cant find dentist', 'dentist waiting list']],
  [
    'Mental Health Service Waits',
    ['mental health funding', 'therapy access', 'counselling wait', 'CAMHS wait'],
  ],
  ['Prescription Costs', ['medicine costs', 'drug prices', 'pharmacy charges']],
  [
    'Delivery Problems',
    [
      'parcel lost',
      'parcel not delivered',
      'left in rain',
      'package stolen',
      'delivery driver',
      'missed delivery',
    ],
  ],
  [
    'Rent Increases',
    ['rent too high', 'rent going up', 'landlord increasing rent', 'no fault eviction'],
  ],
  ['Parking Fines', ['parking ticket', 'parking charge notice', 'PCN', 'unfair parking fine']],
  [
    'Shrinkflation',
    ['smaller portions', 'less for same price', 'package smaller', 'shrinking products'],
  ],
  ['Pothole Damage', ['potholes', 'road damage', 'pothole car damage']],
  ['Council Tax Rises', ['council tax increase', 'council tax too high', 'local tax']],
  ['Damp and Mould in Housing', ['mouldy house', 'damp flat', 'black mould', 'housing disrepair']],
  ['Student Loan Repayment', ['student loans', 'tuition fees', 'education debt', 'student debt']],
  ['AI Replacing Jobs', ['job automation', 'AI taking jobs', 'robots replacing workers']],
  ['Roaming Charges', ['holiday phone bill', 'abroad data charges', 'foreign phone charges']],
  ['Smart Meter Problems', ['smart meter broken', 'meter not working', 'meter lost signal']],
  ['Subscription Traps', ['free trial trap', 'auto renewal', 'charged after trial']],
  ['Fuel Prices', ['petrol prices', 'diesel prices', 'fuel cost', 'petrol too expensive']],
  ['Power Cuts', ['power outage', 'electricity cut', 'blackout', 'no power', 'power failure']],
  [
    'Mortgage Rate Shock',
    ['mortgage increase', 'mortgage rate', 'remortgage', 'fixed rate ending'],
  ],
  [
    'Overseas Transfer Fees',
    ['transfer fees', 'sending money abroad', 'remittance fees', 'wire transfer cost'],
  ],
  ['Hospital Parking Charges', ['hospital parking', 'parking at hospital', 'NHS parking']],
  ['Noisy Neighbours', ['noise complaint', 'neighbour noise', 'loud neighbours', 'noise nuisance']],
  [
    'Rubbish Collection Changes',
    ['bin collection', 'bins not collected', 'recycling confusion', 'missed bin collection'],
  ],
  [
    'Planning Permission Abuse',
    ['planning permission', 'unwanted development', 'green belt', 'building permission'],
  ],
  ['Refund Difficulties', ['cant get refund', 'refund refused', 'return rejected', 'money back']],
  ['Fake Reviews', ['review manipulation', 'paid reviews', 'trust pilot fake', 'fake review']],
  [
    'Food Quality Decline',
    ['food quality', 'ready meal worse', 'food additives', 'portion smaller'],
  ],
  [
    'Self-Checkout Frustration',
    ['self checkout', 'self service', 'no staff tills', 'machine not working'],
  ],
  ['Cost of Childcare', ['childcare cost', 'nursery fees', 'childcare expensive', 'daycare cost']],
  ['Dog Fouling', ['dog mess', 'dog poo', 'dog waste', 'fouling']],
];

async function main() {
  requireRemoteDb();
  printDbBanner();
  const db = getDb();

  let added = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [issueName, terms] of SYNONYMS) {
    // Look up issue by name (not ID — IDs differ between environments)
    const issueResult = await db.execute({
      sql: 'SELECT id FROM issues WHERE name = ?',
      args: [issueName],
    });

    if (issueResult.rows.length === 0) {
      console.log(`  SKIP: "${issueName}" not found in database`);
      notFound++;
      continue;
    }

    const issueId = issueResult.rows[0].id as string;

    for (const term of terms) {
      // Check if synonym already exists
      const existing = await db.execute({
        sql: 'SELECT id FROM synonyms WHERE issue_id = ? AND term = ?',
        args: [issueId, term],
      });

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const id = generateId();
      await db.execute({
        sql: 'INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)',
        args: [id, issueId, term],
      });
      console.log(`  + ${issueName}: "${term}"`);
      added++;
    }
  }

  console.log(`\nDone: ${added} added, ${skipped} already existed, ${notFound} issues not found`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
