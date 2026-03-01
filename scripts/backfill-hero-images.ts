/**
 * Backfill hero images for existing issues and organisations.
 *
 * Generates DALL-E hero images for entities that don't have one yet,
 * converts to WebP, uploads to Vercel Blob, and updates the DB.
 *
 * Usage:
 *   bash scripts/with-staging-env.sh scripts/backfill-hero-images.ts [options]
 *
 * Options:
 *   --dry-run           List entities that would be processed, don't generate
 *   --limit N           Process at most N entities (default: unlimited)
 *   --entity-type TYPE  Only process 'issue' or 'organisation' (default: both)
 *   --delay-ms N        Delay between API calls in ms (default: 2000)
 *
 * Required env vars:
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN
 */

import { printDbBanner } from './db-safety';
import { getDb, withTimeout } from '../src/lib/db';
import { generateHeroImage } from '../src/lib/image-generation';

interface Entity {
  id: string;
  name: string;
  type: 'issue' | 'organisation';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const typeIdx = args.indexOf('--entity-type');
  const entityType = typeIdx !== -1 ? (args[typeIdx + 1] as 'issue' | 'organisation') : null;
  const delayIdx = args.indexOf('--delay-ms');
  const delayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 2000;

  if (entityType && entityType !== 'issue' && entityType !== 'organisation') {
    console.error(`Invalid --entity-type: ${entityType}. Must be 'issue' or 'organisation'.`);
    process.exit(1);
  }

  if (isNaN(limit) || limit < 1) {
    console.error('Invalid --limit value. Must be a positive integer.');
    process.exit(1);
  }

  if (isNaN(delayMs) || delayMs < 0) {
    console.error('Invalid --delay-ms value. Must be a non-negative integer.');
    process.exit(1);
  }

  return { dryRun, limit, entityType, delayMs };
}

async function getEntitiesWithoutHero(entityType: 'issue' | 'organisation'): Promise<Entity[]> {
  const db = getDb();
  const table = entityType === 'issue' ? 'issues' : 'organisations';
  const result = await withTimeout(() =>
    db.execute({
      sql: `SELECT id, name FROM ${table} WHERE status = 'active' AND hero_image_url IS NULL ORDER BY name`,
      args: [],
    }),
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    type: entityType,
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { dryRun, limit, entityType, delayMs } = parseArgs();

  const env = printDbBanner();

  // Check required env vars (non-DB)
  if (!dryRun) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('✖ OPENAI_API_KEY is required (set in .env.local or pass explicitly)');
      process.exit(1);
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('✖ BLOB_READ_WRITE_TOKEN is required (set in .env.local or pass explicitly)');
      process.exit(1);
    }
  }

  // Gather entities
  let entities: Entity[] = [];
  if (!entityType || entityType === 'issue') {
    const issues = await getEntitiesWithoutHero('issue');
    entities.push(...issues);
  }
  if (!entityType || entityType === 'organisation') {
    const orgs = await getEntitiesWithoutHero('organisation');
    entities.push(...orgs);
  }

  // Apply limit
  if (entities.length > limit) {
    entities = entities.slice(0, limit);
  }

  console.log(`Found ${entities.length} entities without hero images${limit < Infinity ? ` (limited to ${limit})` : ''}`);
  if (entities.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  // List entities
  for (const e of entities) {
    console.log(`  ${e.type === 'issue' ? '📋' : '🏢'} [${e.type}] ${e.name} (${e.id})`);
  }

  if (dryRun) {
    console.log(`\n--dry-run: would process ${entities.length} entities. Exiting.`);
    process.exit(0);
  }

  // Process entities
  let succeeded = 0;
  let failed = 0;

  if (env.isProduction) {
    console.log('\n⚠️  Running against PRODUCTION. Starting in 5 seconds...');
    await sleep(5000);
  }

  console.log(`\nGenerating hero images (${delayMs}ms delay between requests)...\n`);

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const progress = `[${i + 1}/${entities.length}]`;

    process.stdout.write(`${progress} ${entity.type === 'issue' ? '📋' : '🏢'} ${entity.name}... `);

    const result = await generateHeroImage(entity.type, entity.id, entity.name);

    if (result.success) {
      succeeded++;
      console.log(`✅ done`);
    } else {
      failed++;
      console.log(`❌ ${result.error}`);
    }

    // Delay between requests to avoid rate limits
    if (i < entities.length - 1) {
      await sleep(delayMs);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Summary:`);
  console.log(`  Total:     ${entities.length}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`${'='.repeat(50)}`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} entities failed. Re-run to retry (entities with images are skipped).`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
