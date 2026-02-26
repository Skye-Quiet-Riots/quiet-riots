import { generateEntityTranslations } from '@/lib/ai';
import { upsertTranslation } from './translations';
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
