/**
 * Shared database environment detection and safety utilities for scripts.
 *
 * Prevents accidental writes to production — especially destructive operations
 * like `npm run seed` which drops all tables.
 *
 * Usage:
 *   import { printDbBanner, confirmOrAbort, blockProductionUnlessForced } from './db-safety';
 */

import * as readline from 'node:readline/promises';

export interface DbEnvironment {
  dbUrl: string;
  label: string;
  isProduction: boolean;
  isStaging: boolean;
  isLocal: boolean;
}

/**
 * Detect which database environment we're pointing at based on env vars.
 */
export function getDbEnvironment(): DbEnvironment {
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:quiet-riots.db';
  const isProduction = dbUrl.includes('turso.io') && !dbUrl.includes('staging');
  const isStaging = dbUrl.includes('staging');
  const isLocal = !dbUrl.includes('turso.io');

  let label: string;
  if (isProduction) {
    label = '\x1b[31m⚠️  PRODUCTION\x1b[0m'; // red
  } else if (isStaging) {
    label = '\x1b[33mSTAGING\x1b[0m'; // yellow
  } else {
    label = '\x1b[32mLOCAL\x1b[0m'; // green
  }

  return { dbUrl, label, isProduction, isStaging, isLocal };
}

/**
 * Print a banner showing which database the script will target.
 */
export function printDbBanner(): DbEnvironment {
  const env = getDbEnvironment();
  console.log(`\nDatabase: ${env.label}`);
  console.log(`URL: ${env.dbUrl}\n`);
  return env;
}

/**
 * Prompt the user for confirmation. Exits with code 0 if declined.
 */
export async function confirmOrAbort(message: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  } finally {
    rl.close();
  }
}

/**
 * Hard-block a destructive script from running against production unless the
 * `--i-know-what-im-doing` flag is explicitly passed.
 *
 * Even with the flag, still requires interactive confirmation.
 */
export async function blockProductionUnlessForced(scriptName: string): Promise<void> {
  const env = getDbEnvironment();

  if (!env.isProduction) return;

  const hasForceFlag = process.argv.includes('--i-know-what-im-doing');
  if (!hasForceFlag) {
    console.error(
      `\x1b[31m✖ BLOCKED: "${scriptName}" cannot run against PRODUCTION without the --i-know-what-im-doing flag.\x1b[0m`,
    );
    console.error(`  This is a destructive operation that will drop all tables and re-seed.`);
    console.error(`  If you really mean to do this, run:`);
    console.error(`    npm run seed:production`);
    console.error(`  or:`);
    console.error(
      `    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/${scriptName}.ts --i-know-what-im-doing\n`,
    );
    process.exit(1);
  }

  // Even with the flag, require explicit confirmation
  await confirmOrAbort(
    '\x1b[31m⚠️  You are about to DROP ALL TABLES and re-seed the PRODUCTION database. This is irreversible. Continue?\x1b[0m',
  );
}
