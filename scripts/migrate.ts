/**
 * Database migration runner.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts          — run pending migrations
 *   npx tsx scripts/migrate.ts status   — show applied and pending migrations
 */

import { migrate, getMigrationStatus } from '../src/lib/migrate';

async function main() {
  const command = process.argv[2] || 'run';

  if (command === 'status') {
    const { applied, pending } = await getMigrationStatus();

    console.log('\n=== Migration Status ===\n');

    if (applied.length > 0) {
      console.log('Applied:');
      for (const m of applied) {
        console.log(`  ✓ ${m.name} (${m.applied_at})`);
      }
    } else {
      console.log('No migrations applied yet.');
    }

    if (pending.length > 0) {
      console.log('\nPending:');
      for (const name of pending) {
        console.log(`  ○ ${name}`);
      }
    } else {
      console.log('\nNo pending migrations.');
    }

    console.log('');
    process.exit(0);
  }

  if (command === 'run') {
    console.log('Running migrations...');
    const applied = await migrate();

    if (applied.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Applied ${applied.length} migration(s):`);
      for (const name of applied) {
        console.log(`  ✓ ${name}`);
      }
    }
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  console.error('Usage: npx tsx scripts/migrate.ts [run|status]');
  process.exit(1);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
