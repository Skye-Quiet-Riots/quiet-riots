import { getDb } from './db';
import fs from 'fs';
import path from 'path';

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

/**
 * Ensure the migrations tracking table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Get list of already-applied migrations.
 */
async function getAppliedMigrations(): Promise<string[]> {
  const db = getDb();
  const result = await db.execute('SELECT name FROM _migrations ORDER BY id ASC');
  return result.rows.map((row) => row.name as string);
}

/**
 * Get list of pending migration files from the migrations/ directory.
 * Files must be named like: 001_create_tables.sql, 002_add_phone.sql
 */
function getPendingMigrationFiles(applied: string[]): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.filter((f) => !applied.includes(f));
}

/**
 * Run all pending migrations in order.
 * Returns the list of newly applied migration names.
 */
export async function migrate(): Promise<string[]> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const pending = getPendingMigrationFiles(applied);

  if (pending.length === 0) {
    return [];
  }

  const db = getDb();
  const newlyApplied: string[] = [];

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8').trim();

    if (!sql) {
      throw new Error(`Migration file is empty: ${file}`);
    }

    await db.executeMultiple(sql);
    await db.execute({
      sql: 'INSERT INTO _migrations (name) VALUES (?)',
      args: [file],
    });

    newlyApplied.push(file);
  }

  return newlyApplied;
}

/**
 * Get migration status: applied and pending.
 */
export async function getMigrationStatus(): Promise<{
  applied: MigrationRecord[];
  pending: string[];
}> {
  await ensureMigrationsTable();

  const db = getDb();
  const result = await db.execute('SELECT * FROM _migrations ORDER BY id ASC');
  const applied = result.rows as unknown as MigrationRecord[];
  const appliedNames = applied.map((r) => r.name);
  const pending = getPendingMigrationFiles(appliedNames);

  return { applied, pending };
}
