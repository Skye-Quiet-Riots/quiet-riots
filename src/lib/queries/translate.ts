import { getTranslatedEntities } from './translations';
import type { IssuePivotRow, OrgPivotRow } from '@/types';

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
 * Translate campaign objects (which use `title` instead of `name`).
 */
export async function translateCampaigns<
  T extends { id: string; title: string; description?: string | null },
>(campaigns: T[], locale: string): Promise<T[]> {
  if (locale === 'en' || campaigns.length === 0) return campaigns;

  const translations = await getTranslatedEntities(
    'campaign',
    campaigns.map((c) => c.id),
    locale,
  );

  return campaigns.map((campaign) => {
    const t = translations[campaign.id];
    if (!t) return campaign;
    return {
      ...campaign,
      title: t.title || campaign.title,
      ...(campaign.description !== undefined && {
        description: t.description || campaign.description,
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
 * Translate issue names in org pivot rows.
 * Looks up translations for `issue_id` entities.
 */
export async function translateOrgPivotRows(
  rows: OrgPivotRow[],
  locale: string,
): Promise<OrgPivotRow[]> {
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
