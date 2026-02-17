import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { _setTestDb, _resetDb, getDb } from './db';
import { migrate, getMigrationStatus } from './migrate';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

beforeAll(() => {
  const testClient = createClient({ url: 'file::memory:' });
  _setTestDb(testClient);
});

afterAll(() => {
  _resetDb();
});

beforeEach(async () => {
  // Clean up migrations table between tests
  const db = getDb();
  await db.execute('DROP TABLE IF EXISTS _migrations');
  await db.execute('DROP TABLE IF EXISTS issues');
});

describe('migrate', () => {
  it('creates _migrations table and applies pending migrations', async () => {
    const applied = await migrate();

    // Should have applied at least the baseline migration
    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied[0]).toBe('001_baseline.sql');
  });

  it('is idempotent — running again applies nothing', async () => {
    await migrate();
    const secondRun = await migrate();
    expect(secondRun).toHaveLength(0);
  });

  it('baseline migration creates all expected tables', async () => {
    await migrate();

    const db = getDb();
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_migrations' ORDER BY name",
    );
    const tableNames = tables.rows.map((r) => r.name as string);

    expect(tableNames).toContain('issues');
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('organisations');
    expect(tableNames).toContain('user_issues');
    expect(tableNames).toContain('actions');
    expect(tableNames).toContain('feed');
    expect(tableNames).toContain('community_health');
    expect(tableNames).toContain('expert_profiles');
    expect(tableNames).toContain('country_breakdown');
    expect(tableNames).toContain('synonyms');
    expect(tableNames).toContain('issue_organisation');
  });
});

describe('getMigrationStatus', () => {
  it('shows pending migrations before first run', async () => {
    const { applied, pending } = await getMigrationStatus();
    expect(applied).toHaveLength(0);
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending[0]).toBe('001_baseline.sql');
  });

  it('shows applied and no pending after migrate', async () => {
    await migrate();
    const { applied, pending } = await getMigrationStatus();

    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied[0].name).toBe('001_baseline.sql');
    expect(pending).toHaveLength(0);
  });
});
