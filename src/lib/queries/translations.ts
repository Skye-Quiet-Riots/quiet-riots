import { getDb } from '../db';

/**
 * Get a single translated value for an entity field.
 * Falls back to null if no translation exists for the given language.
 */
export async function getTranslation(
  entityType: string,
  entityId: string,
  field: string,
  languageCode: string,
): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT value FROM translations
          WHERE entity_type = ? AND entity_id = ? AND field = ? AND language_code = ?`,
    args: [entityType, entityId, field, languageCode],
  });
  if (!result.rows[0]) return null;
  return result.rows[0].value as string;
}

/**
 * Get translated values for a specific entity (all fields).
 * Returns a map of field → translated value.
 */
export async function getEntityTranslations(
  entityType: string,
  entityId: string,
  languageCode: string,
): Promise<Record<string, string>> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT field, value FROM translations
          WHERE entity_type = ? AND entity_id = ? AND language_code = ?`,
    args: [entityType, entityId, languageCode],
  });
  const translations: Record<string, string> = {};
  for (const row of result.rows) {
    translations[row.field as string] = row.value as string;
  }
  return translations;
}

/**
 * Batch-fetch translations for multiple entities of the same type.
 * Returns a map of entityId → { field → translatedValue }.
 * Avoids N+1 queries when displaying lists.
 */
export async function getTranslatedEntities(
  entityType: string,
  entityIds: string[],
  languageCode: string,
): Promise<Record<string, Record<string, string>>> {
  if (entityIds.length === 0) return {};

  const db = getDb();
  const placeholders = entityIds.map(() => '?').join(', ');
  const result = await db.execute({
    sql: `SELECT entity_id, field, value FROM translations
          WHERE entity_type = ? AND entity_id IN (${placeholders}) AND language_code = ?`,
    args: [entityType, ...entityIds, languageCode],
  });

  const translations: Record<string, Record<string, string>> = {};
  for (const row of result.rows) {
    const id = row.entity_id as string;
    if (!translations[id]) translations[id] = {};
    translations[id][row.field as string] = row.value as string;
  }
  return translations;
}

/**
 * Upsert a translation (insert or update if exists).
 * Used by the translate API route to cache translations.
 */
export async function upsertTranslation(
  entityType: string,
  entityId: string,
  field: string,
  languageCode: string,
  value: string,
  source: 'machine' | 'manual' | 'reviewed' = 'machine',
): Promise<void> {
  const db = getDb();
  const { generateId } = await import('../uuid');
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(entity_type, entity_id, field, language_code)
          DO UPDATE SET value = excluded.value, source = excluded.source`,
    args: [id, entityType, entityId, field, languageCode, value, source],
  });
}
