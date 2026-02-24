import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../db';
import { createTables, dropTables } from '../schema';
import {
  getTranslation,
  getEntityTranslations,
  getTranslatedEntities,
  upsertTranslation,
} from './translations';

beforeAll(async () => {
  const db = getDb();
  await dropTables(db);
  await createTables(db);

  // Seed languages used in tests (translations.language_code has FK to languages.code)
  const langs = [
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
  ];
  for (const l of langs) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO languages (code, name, native_name) VALUES (?, ?, ?)`,
      args: [l.code, l.name, l.native],
    });
  }
});

describe('translations queries', () => {
  it('returns null when no translation exists', async () => {
    const result = await getTranslation('issue', 'nonexistent', 'name', 'fr');
    expect(result).toBeNull();
  });

  it('upserts and retrieves a single translation', async () => {
    await upsertTranslation('issue', 'issue-1', 'name', 'fr', 'Retards des trains');
    const result = await getTranslation('issue', 'issue-1', 'name', 'fr');
    expect(result).toBe('Retards des trains');
  });

  it('updates existing translation on conflict', async () => {
    await upsertTranslation('issue', 'issue-1', 'name', 'fr', 'Retards des trains v1');
    await upsertTranslation('issue', 'issue-1', 'name', 'fr', 'Retards des trains v2');
    const result = await getTranslation('issue', 'issue-1', 'name', 'fr');
    expect(result).toBe('Retards des trains v2');
  });

  it('retrieves all fields for an entity', async () => {
    await upsertTranslation('issue', 'issue-2', 'name', 'es', 'Retrasos del tren');
    await upsertTranslation('issue', 'issue-2', 'description', 'es', 'Los trenes llegan tarde');

    const result = await getEntityTranslations('issue', 'issue-2', 'es');
    expect(result).toEqual({
      name: 'Retrasos del tren',
      description: 'Los trenes llegan tarde',
    });
  });

  it('returns empty object for entity with no translations', async () => {
    const result = await getEntityTranslations('issue', 'no-translations', 'es');
    expect(result).toEqual({});
  });

  it('batch-fetches translations for multiple entities', async () => {
    await upsertTranslation('org', 'org-1', 'name', 'de', 'Deutsche Bahn');
    await upsertTranslation('org', 'org-2', 'name', 'de', 'Lufthansa');
    await upsertTranslation('org', 'org-1', 'description', 'de', 'Eisenbahn');

    const result = await getTranslatedEntities('org', ['org-1', 'org-2', 'org-3'], 'de');
    expect(result['org-1']).toEqual({
      name: 'Deutsche Bahn',
      description: 'Eisenbahn',
    });
    expect(result['org-2']).toEqual({ name: 'Lufthansa' });
    expect(result['org-3']).toBeUndefined();
  });

  it('returns empty object for empty entity IDs', async () => {
    const result = await getTranslatedEntities('org', [], 'de');
    expect(result).toEqual({});
  });

  it('preserves source field on upsert', async () => {
    await upsertTranslation('category', 'cat-1', 'name', 'ja', '交通', 'manual');
    const db = getDb();
    const row = await db.execute({
      sql: `SELECT source FROM translations WHERE entity_type = 'category' AND entity_id = 'cat-1' AND language_code = 'ja'`,
      args: [],
    });
    expect(row.rows[0]?.source).toBe('manual');
  });

  it('does not cross-contaminate between languages', async () => {
    await upsertTranslation('issue', 'issue-3', 'name', 'fr', 'French name');
    await upsertTranslation('issue', 'issue-3', 'name', 'de', 'German name');
    expect(await getTranslation('issue', 'issue-3', 'name', 'fr')).toBe('French name');
    expect(await getTranslation('issue', 'issue-3', 'name', 'de')).toBe('German name');
    expect(await getTranslation('issue', 'issue-3', 'name', 'es')).toBeNull();
  });
});
