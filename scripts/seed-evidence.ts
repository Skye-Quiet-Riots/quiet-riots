/**
 * Seed evidence data into an existing database (production-safe).
 * Looks up issues, orgs, and users by name — does NOT drop any tables.
 *
 * Usage:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-evidence.ts
 */

import { createClient } from '@libsql/client';
import crypto from 'crypto';

const url = process.env.TURSO_DATABASE_URL || 'file:quiet-riots.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// Banner
const isProduction = url.includes('quiet-riots-skye-quiet-riots');
const isStaging = url.includes('staging');
const label = isProduction
  ? '\x1b[31m⚠️  PRODUCTION\x1b[0m'
  : isStaging
    ? '🟡 STAGING'
    : '🟢 LOCAL';
console.log(`\nDatabase: ${label}`);
console.log(`URL: ${url}\n`);

const db = createClient({ url, authToken });

function generateId(): string {
  return crypto.randomUUID();
}

async function lookupId(table: string, name: string): Promise<string> {
  const result = await db.execute({ sql: `SELECT id FROM ${table} WHERE name = ?`, args: [name] });
  if (result.rows.length === 0) {
    throw new Error(`${table} not found: "${name}"`);
  }
  return result.rows[0].id as string;
}

async function insertRow(sql: string, args: (string | number | null)[]): Promise<string> {
  const id = generateId();
  await db.execute({ sql, args: [id, ...args] });
  return id;
}

async function main() {
  // Check if evidence already exists
  const existing = await db.execute('SELECT COUNT(*) as count FROM evidence');
  const count = existing.rows[0].count as number;
  if (count > 0) {
    console.log(`⚠️  Evidence table already has ${count} rows. Skipping to avoid duplicates.`);
    console.log('   To re-seed, first run: DELETE FROM evidence_comments; DELETE FROM evidence;');
    process.exit(0);
  }

  // Look up IDs by name
  const trainId = await lookupId('issues', 'Train Cancellations');
  const northernId = await lookupId('organisations', 'Northern Trains');

  const userIds: Record<string, string> = {};
  for (const name of [
    'Sarah K.',
    'James L.',
    'Emma W.',
    'Marcio R.',
    'Priya S.',
    'Dr. Patel',
    'Yuki T.',
    'Carlos M.',
  ]) {
    userIds[name] = await lookupId('users', name);
  }

  console.log('Found all required IDs:');
  console.log(`  Train Cancellations: ${trainId}`);
  console.log(`  Northern Trains: ${northernId}`);
  console.log(`  Users: ${Object.keys(userIds).join(', ')}\n`);

  const evidenceSql = `INSERT INTO evidence (id, issue_id, org_id, user_id, content, media_type, photo_urls, video_url, external_urls, live, likes, comments_count, shares, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // 1. Text: Platform cancelled, no announcement (Sarah K.)
  const ev1 = await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Sarah K.'],
    'Platform 3 at Leeds just cleared the board — every Northern service cancelled until further notice. No announcement, no staff in sight. Passengers left standing in the cold.',
    'text',
    '[]',
    null,
    '[]',
    0,
    14,
    2,
    3,
    '2025-03-15 08:22:00',
  ]);

  // 2. Photo: Departure board with 5 cancellations (James L.)
  const ev2 = await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['James L.'],
    'Five cancellations in a row. This is what the departure board at Manchester Victoria looks like every morning.',
    'photo',
    '["/evidence/manchester-victoria-departures.jpg"]',
    null,
    '[]',
    0,
    22,
    1,
    8,
    '2025-03-14 07:45:00',
  ]);

  // 3. Text+link: 2-month tracking data (Emma W., no org)
  await insertRow(evidenceSql, [
    trainId,
    null,
    userIds['Emma W.'],
    'I have been tracking every cancellation for 2 months. 47 cancellations out of 120 scheduled services on the Leeds-Skipton route. That is a 39% failure rate.',
    'link',
    '[]',
    null,
    '["https://www.networkrail.co.uk/running-the-railway/performance/"]',
    0,
    31,
    3,
    12,
    '2025-03-13 19:30:00',
  ]);

  // 4. Live stream: Sheffield station packed (Marcio R.)
  await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Marcio R.'],
    'Going live from Sheffield station — absolute chaos. Three trains cancelled back-to-back, the platform is heaving.',
    'live_stream',
    '[]',
    null,
    '[]',
    0,
    18,
    0,
    5,
    '2025-03-12 17:55:00',
  ]);

  // 5. Photo x2: "Minor disruption" reality (Priya S.)
  await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Priya S.'],
    'Northern call this "minor disruption". These photos tell a different story. People crammed on a 2-coach train that should be 4.',
    'photo',
    '["https://images.unsplash.com/photo-1751469304260-8d8f514298ac?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1697494909419-7411c4c3d473?w=800&h=600&fit=crop"]',
    null,
    '[]',
    0,
    27,
    2,
    7,
    '2025-03-11 08:10:00',
  ]);

  // 6. Link: ORR performance data (Dr. Patel)
  await insertRow(evidenceSql, [
    trainId,
    null,
    userIds['Dr. Patel'],
    'The Office of Rail and Road just published Q3 performance data. Northern has the worst cancellation rate of any operator — 6.8% of services cancelled versus 3.2% industry average.',
    'link',
    '[]',
    null,
    '["https://dataportal.orr.gov.uk/"]',
    0,
    35,
    4,
    15,
    '2025-03-10 14:20:00',
  ]);

  // 7. Video: Guard telling passengers to wait (Yuki T.)
  await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Yuki T.'],
    'Filmed this at Huddersfield. Guard telling a packed platform there is no information on when the next train will arrive. "Just wait" is not good enough.',
    'video',
    '[]',
    'https://www.youtube.com/watch?v=nGdFHJXciYE',
    '[]',
    0,
    19,
    1,
    4,
    '2025-03-09 18:40:00',
  ]);

  // 8. Text: Missed daughter school play (Carlos M.)
  await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Carlos M.'],
    "Missed my daughter's school play because the 16:45 from Manchester was cancelled with no replacement service. She was looking for me in the audience. This cannot keep happening.",
    'text',
    '[]',
    null,
    '[]',
    0,
    42,
    5,
    9,
    '2025-03-08 20:15:00',
  ]);

  // 9. Live stream: Day 4 no service (Sarah K.) — simulates "live now"
  const ev9 = await insertRow(evidenceSql, [
    trainId,
    northernId,
    userIds['Sarah K.'],
    'Day 4 with no direct service Leeds to Harrogate. Going live from the bus replacement. This is 2025, not 1925.',
    'live_stream',
    '[]',
    null,
    '[]',
    1,
    8,
    0,
    2,
    new Date().toISOString().replace('T', ' ').slice(0, 19),
  ]);

  // 10. Photo: Replacement bus (James L., no org)
  await insertRow(evidenceSql, [
    trainId,
    null,
    userIds['James L.'],
    'The "rail replacement bus" turned up 40 minutes late and only goes to the wrong station. You literally could not make this up.',
    'photo',
    '["https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=600&fit=crop"]',
    null,
    '[]',
    0,
    16,
    2,
    6,
    '2025-03-06 09:30:00',
  ]);

  console.log('✓ 10 evidence posts inserted');

  // Evidence comments
  const evCommentSql = `INSERT INTO evidence_comments (id, evidence_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`;

  await insertRow(evCommentSql, [
    ev1,
    userIds['James L.'],
    'Same thing at Victoria. They just silently remove services from the board.',
    '2025-03-15 08:35:00',
  ]);
  await insertRow(evCommentSql, [
    ev1,
    userIds['Dr. Patel'],
    'This is exactly the kind of evidence the ORR needs. Keep documenting.',
    '2025-03-15 09:10:00',
  ]);
  await insertRow(evCommentSql, [
    ev2,
    userIds['Priya S.'],
    'I see this every single day. The 07:12 has been cancelled more than it has run this month.',
    '2025-03-14 08:02:00',
  ]);
  await insertRow(evCommentSql, [
    ev9,
    userIds['Marcio R.'],
    'Stay strong Sarah. We are all watching.',
    new Date().toISOString().replace('T', ' ').slice(0, 19),
  ]);

  console.log('✓ 4 evidence comments inserted');
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
