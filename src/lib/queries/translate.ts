import { getTranslatedEntities } from './translations';
import type { IssuePivotRow, Synonym } from '@/types';

/**
 * Overlay DB translations onto entity objects (issues, organisations).
 * Falls back to original English values if no translation exists.
 * Short-circuits for 'en' locale (no DB query).
 */
export async function translateEntities<
  T extends { id: string; name: string; description?: string | null },
>(entities: T[], entityType: string, locale: string): Promise<T[]> {
  if (locale === 'en' || entities.length === 0) return entities;

  const translations = await getTranslatedEntities(
    entityType,
    entities.map((e) => e.id),
    locale,
  );

  return entities.map((entity) => {
    const t = translations[entity.id];
    if (!t) return entity;
    return {
      ...entity,
      name: t.name || entity.name,
      ...(entity.description !== undefined && { description: t.description || entity.description }),
    };
  });
}

/** Translate a single entity. Falls back to original values. */
export async function translateEntity<
  T extends { id: string; name: string; description?: string | null },
>(entity: T, entityType: string, locale: string): Promise<T> {
  const [result] = await translateEntities([entity], entityType, locale);
  return result;
}

/**
 * Translate action initiative objects (which use `title` instead of `name`).
 */
export async function translateActionInitiatives<
  T extends { id: string; title: string; description?: string | null },
>(actionInitiatives: T[], locale: string): Promise<T[]> {
  if (locale === 'en' || actionInitiatives.length === 0) return actionInitiatives;

  const translations = await getTranslatedEntities(
    'action_initiative',
    actionInitiatives.map((ai) => ai.id),
    locale,
  );

  return actionInitiatives.map((actionInitiative) => {
    const t = translations[actionInitiative.id];
    if (!t) return actionInitiative;
    return {
      ...actionInitiative,
      title: t.title || actionInitiative.title,
      ...(actionInitiative.description !== undefined && {
        description: t.description || actionInitiative.description,
      }),
    };
  });
}

/**
 * Translate organisation names in issue pivot rows.
 * Looks up translations for `organisation_id` entities.
 */
export async function translateIssuePivotRows(
  rows: IssuePivotRow[],
  locale: string,
): Promise<IssuePivotRow[]> {
  if (locale === 'en' || rows.length === 0) return rows;

  const translations = await getTranslatedEntities(
    'organisation',
    rows.map((r) => r.organisation_id),
    locale,
  );

  return rows.map((row) => {
    const t = translations[row.organisation_id];
    if (!t) return row;
    return { ...row, organisation_name: t.name || row.organisation_name };
  });
}

/**
 * Translate issue names in org pivot rows or any rows with issue_id + issue_name.
 * Looks up translations for `issue_id` entities.
 */
export async function translateOrgPivotRows<T extends { issue_id: string; issue_name: string }>(
  rows: T[],
  locale: string,
): Promise<T[]> {
  if (locale === 'en' || rows.length === 0) return rows;

  const translations = await getTranslatedEntities(
    'issue',
    rows.map((r) => r.issue_id),
    locale,
  );

  return rows.map((row) => {
    const t = translations[row.issue_id];
    if (!t) return row;
    return { ...row, issue_name: t.name || row.issue_name };
  });
}

/**
 * Translate synonym terms for display. Overlays translated terms onto synonym objects.
 * Falls back to original English terms if no translation exists.
 */
export async function translateSynonyms(synonyms: Synonym[], locale: string): Promise<Synonym[]> {
  if (locale === 'en' || synonyms.length === 0) return synonyms;

  const translations = await getTranslatedEntities(
    'synonym',
    synonyms.map((s) => s.id),
    locale,
  );

  return synonyms.map((synonym) => {
    const t = translations[synonym.id];
    if (!t || !t.term) return synonym;
    return { ...synonym, term: t.term };
  });
}
