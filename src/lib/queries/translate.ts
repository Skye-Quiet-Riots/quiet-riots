import { getTranslatedEntities } from './translations';
import type { CountryBreakdown, IssuePivotRow } from '@/types';

/**
 * Generic translation overlay: applies ALL translated fields from the DB
 * onto entity objects. Any string/null field with a non-empty translation
 * gets overlaid. Non-string fields, fields without translations, and fields
 * that don't exist on the entity are left untouched.
 *
 * This is the core translation function — all entity-specific translate
 * functions delegate to it. Adding a new translatable field to any entity
 * requires ZERO code changes here — just add translations to the DB.
 */
export async function translateAny<T extends { id: string }>(
  entities: T[],
  entityType: string,
  locale: string,
): Promise<T[]> {
  if (locale === 'en' || entities.length === 0) return entities;

  const translations = await getTranslatedEntities(
    entityType,
    entities.map((e) => e.id),
    locale,
  );

  return entities.map((entity) => {
    const t = translations[entity.id];
    if (!t) return entity;

    const overlay: Record<string, string> = {};
    for (const [field, value] of Object.entries(t)) {
      if (!value) continue; // skip empty translations
      if (!(field in entity)) continue; // skip fields not on the entity
      const current = (entity as Record<string, unknown>)[field];
      if (typeof current !== 'string' && current !== null) continue; // only overlay string/null
      overlay[field] = value;
    }

    return Object.keys(overlay).length > 0 ? { ...entity, ...overlay } : entity;
  });
}

/**
 * Overlay DB translations onto entity objects (issues, organisations, etc.).
 * Falls back to original English values if no translation exists.
 * Short-circuits for 'en' locale (no DB query).
 */
export async function translateEntities<
  T extends { id: string; name: string; description?: string | null },
>(entities: T[], entityType: string, locale: string): Promise<T[]> {
  return translateAny(entities, entityType, locale);
}

/** Translate a single entity. Falls back to original values. */
export async function translateEntity<
  T extends { id: string; name: string; description?: string | null },
>(entity: T, entityType: string, locale: string): Promise<T> {
  const [result] = await translateAny([entity], entityType, locale);
  return result;
}

/**
 * Translate action initiative objects (which use `title` instead of `name`).
 */
export async function translateActionInitiatives<
  T extends { id: string; title: string; description?: string | null },
>(actionInitiatives: T[], locale: string): Promise<T[]> {
  return translateAny(actionInitiatives, 'action_initiative', locale);
}

/**
 * Translate organisation names in issue pivot rows.
 * Custom: maps organisation translations onto rows with organisation_id.
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
 * Custom: maps issue translations onto rows with issue_id.
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
 * Translate synonym terms for display.
 */
export async function translateSynonyms<T extends { id: string; term: string }>(
  synonyms: T[],
  locale: string,
): Promise<T[]> {
  return translateAny(synonyms, 'synonym', locale);
}

/**
 * Translate action objects (which use `title` instead of `name`).
 */
export async function translateActions<
  T extends { id: string; title: string; description?: string | null },
>(actions: T[], locale: string): Promise<T[]> {
  return translateAny(actions, 'action', locale);
}

/**
 * Translate expert profile objects.
 * Does NOT translate `name` (proper nouns like "Dr. Sarah Chen") — the name
 * field is a string but has no translation rows in the DB, so translateAny
 * correctly leaves it unchanged.
 */
export async function translateExpertProfiles<
  T extends { id: string; role: string; speciality: string; achievement: string },
>(profiles: T[], locale: string): Promise<T[]> {
  return translateAny(profiles, 'expert_profile', locale);
}

/**
 * Translate riot reel objects.
 * Only curated/seeded reel titles get translations; community-submitted reels
 * keep their YouTube titles (translateAny harmlessly returns the original when
 * no translation exists).
 */
export async function translateRiotReels<
  T extends { id: string; title: string; caption: string },
>(reels: T[], locale: string): Promise<T[]> {
  return translateAny(reels, 'riot_reel', locale);
}

/**
 * Translate a single category assistant object.
 * Overlays all translated text fields (quotes, bios, goal, focus, focus_detail).
 * Does NOT translate proper names (agent_name, human_name) — no translation
 * rows exist for those fields.
 */
export async function translateCategoryAssistant<T extends { id: string }>(
  assistant: T,
  locale: string,
): Promise<T> {
  const [result] = await translateAny([assistant], 'category_assistant', locale);
  return result;
}

/**
 * Translate multiple category assistant objects (for the list endpoint).
 * Uses batch query to avoid N+1.
 */
export async function translateCategoryAssistants<T extends { id: string }>(
  assistants: T[],
  locale: string,
): Promise<T[]> {
  return translateAny(assistants, 'category_assistant', locale);
}

/**
 * Translate a country code to a localised display name using Intl.DisplayNames.
 * Zero DB rows needed — uses the built-in Node.js API.
 *
 * For romanised (-Latn) locales, falls back to English since Intl.DisplayNames
 * returns native script characters for those locales.
 */
export function translateCountryName(code: string, locale: string): string {
  if (locale === 'en') return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;

  // Romanised locales get native script from Intl.DisplayNames — fall back to English
  const effectiveLocale = locale.endsWith('-Latn') ? 'en' : locale;

  try {
    const dn = new Intl.DisplayNames([effectiveLocale], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    // Fallback to English if locale not supported
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  }
}

/**
 * Translate an array of country objects (code + name) to localised names.
 * Uses Intl.DisplayNames — no DB query needed.
 */
export function translateCountryNames<T extends { code: string; name: string }>(
  countries: T[],
  locale: string,
): T[] {
  if (locale === 'en' || countries.length === 0) return countries;

  return countries.map((country) => ({
    ...country,
    name: translateCountryName(country.code, locale),
  }));
}

/**
 * Translate country names in CountryBreakdown objects (used on issue detail pages).
 * Uses Intl.DisplayNames — no DB query needed.
 */
export function translateCountryBreakdown(
  countries: CountryBreakdown[],
  locale: string,
): CountryBreakdown[] {
  if (locale === 'en' || countries.length === 0) return countries;

  return countries.map((country) => ({
    ...country,
    country_name: translateCountryName(country.country_code, locale),
  }));
}
