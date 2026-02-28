import { generateEntityTranslations } from '@/lib/ai';
import { upsertTranslation } from './translations';
import { markTranslationsReady } from './suggestions';
import { sanitizeText } from '@/lib/sanitize';

/**
 * Generate translations for an entity's fields into all supported locales
 * using Claude, then store them in the translations table.
 *
 * @param entityType - 'issue', 'organisation', or 'action_initiative'
 * @param entityId - The entity ID
 * @param fields - Map of field names to English values (e.g. { name: "...", description: "..." })
 * @returns Success status and count of locales translated
 */
export async function generateAndStoreTranslations(
  entityType: string,
  entityId: string,
  fields: Record<string, string>,
): Promise<{ success: boolean; localeCount: number }> {
  const translations = await generateEntityTranslations(fields);

  if (Object.keys(translations).length === 0) {
    return { success: false, localeCount: 0 };
  }

  let localeCount = 0;
  for (const [locale, fieldMap] of Object.entries(translations)) {
    for (const [field, value] of Object.entries(fieldMap)) {
      if (value && typeof value === 'string') {
        await upsertTranslation(entityType, entityId, field, locale, sanitizeText(value), 'machine');
      }
    }
    localeCount++;
  }

  return { success: true, localeCount };
}

/**
 * Generate translations for a newly-approved suggestion's entity and
 * advance the suggestion to 'translations_ready' on success.
 *
 * Designed to be called from `after()` in the approve handler — runs
 * after the response is sent so the guide doesn't wait for the API call.
 * If it fails, the suggestion stays 'approved' and the guide can retry
 * via POST /api/suggestions/[id]/generate-translations.
 */
export async function triggerAutoTranslation(
  suggestionId: string,
  entityType: 'issue' | 'organisation',
  entityId: string,
  fields: Record<string, string>,
): Promise<{ success: boolean; localeCount: number }> {
  const result = await generateAndStoreTranslations(entityType, entityId, fields);
  if (result.success) {
    await markTranslationsReady(suggestionId);
  }
  return result;
}
