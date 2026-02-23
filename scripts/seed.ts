import { seed } from '../src/lib/seed';
import { printDbBanner, confirmOrAbort, blockProductionUnlessForced } from './db-safety';

async function main() {
  const env = printDbBanner();

  // Hard-block production unless --i-know-what-im-doing flag is passed
  await blockProductionUnlessForced('seed');

  // Require confirmation for staging (but not local SQLite)
  if (env.isStaging) {
    await confirmOrAbort('This will DROP ALL TABLES on the STAGING database and re-seed. Continue?');
  }

  await seed();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
