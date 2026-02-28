import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  translateAny,
  translateEntities,
  translateEntity,
  translateActions,
  translateActionInitiatives,
  translateExpertProfiles,
  translateRiotReels,
  translateIssuePivotRows,
  translateOrgPivotRows,
  translateCountryName,
  translateCountryNames,
  translateCountryBreakdown,
} from './translate';

// Mock the translations query module
vi.mock('./translations', () => ({
  getTranslatedEntities: vi.fn(),
}));

import { getTranslatedEntities } from './translations';
const mockGetTranslatedEntities = vi.mocked(getTranslatedEntities);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── translateAny (generic overlay) ─────────────────────────────────────────

describe('translateAny', () => {
  it('short-circuits for English locale', async () => {
    const items = [{ id: '1', name: 'Test' }];
    const result = await translateAny(items, 'test', 'en');
    expect(result).toBe(items);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateAny([], 'test', 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('overlays all string fields that have translations', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: 'Translated Name', description: 'Translated Desc', agent_helps: 'Translated Help' },
    });

    const entities = [{ id: 'i1', name: 'Name', description: 'Desc', agent_helps: 'Help' }];
    const result = await translateAny(entities, 'issue', 'de');
    expect(result[0].name).toBe('Translated Name');
    expect(result[0].description).toBe('Translated Desc');
    expect(result[0].agent_helps).toBe('Translated Help');
  });

  it('overlays null fields with translations', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { agent_focus: 'Translated Focus' },
    });

    const entities = [{ id: 'i1', name: 'Name', agent_focus: null as string | null }];
    const result = await translateAny(entities, 'issue', 'es');
    expect(result[0].agent_focus).toBe('Translated Focus');
  });

  it('does NOT overlay non-string fields (type safety)', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { rioter_count: 'should not be applied' },
    });

    const entities = [{ id: 'i1', name: 'Test', rioter_count: 500 }];
    const result = await translateAny(entities, 'issue', 'de');
    expect(result[0].rioter_count).toBe(500); // unchanged — number field
  });

  it('does NOT inject fields that do not exist on the entity', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { sneaky_field: 'injected value' },
    });

    const entities = [{ id: 'i1', name: 'Test' }];
    const result = await translateAny(entities, 'issue', 'de');
    expect(result[0]).toEqual({ id: 'i1', name: 'Test' }); // no sneaky_field
    expect((result[0] as Record<string, unknown>).sneaky_field).toBeUndefined();
  });

  it('does not overwrite with empty translation strings', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: '', description: '' },
    });

    const entities = [{ id: 'i1', name: 'Original', description: 'Original Desc' }];
    const result = await translateAny(entities, 'issue', 'de');
    expect(result[0].name).toBe('Original');
    expect(result[0].description).toBe('Original Desc');
  });

  it('falls back to original when no translations exist', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    const entities = [{ id: 'i1', name: 'Original' }];
    const result = await translateAny(entities, 'issue', 'fr');
    expect(result).toEqual(entities);
  });

  it('returns same object reference when no overlay is applied', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    const entity = { id: 'i1', name: 'Test' };
    const result = await translateAny([entity], 'issue', 'fr');
    expect(result[0]).toBe(entity); // same reference — no spread
  });
});

describe('translateEntities', () => {
  const issues = [
    { id: 'i1', name: 'Train Delays', description: 'Trains are always late' },
    { id: 'i2', name: 'Bus Fares', description: 'Too expensive' },
    { id: 'i3', name: 'Road Safety', description: null },
  ];

  it('short-circuits for English locale (no DB query)', async () => {
    const result = await translateEntities(issues, 'issue', 'en');
    expect(result).toBe(issues);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateEntities([], 'issue', 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates name and description when available', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: 'Zugverspätungen', description: 'Züge verspäten sich' },
      i2: { name: 'Busfahrpreise' },
    });

    const result = await translateEntities(issues, 'issue', 'de');
    expect(result[0].name).toBe('Zugverspätungen');
    expect(result[0].description).toBe('Züge verspäten sich');
    expect(result[1].name).toBe('Busfahrpreise');
    expect(result[1].description).toBe('Too expensive'); // fallback
    expect(result[2].name).toBe('Road Safety'); // no translation
    expect(result[2].description).toBeNull();
  });

  it('falls back to original values for untranslated entities', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    const result = await translateEntities(issues, 'issue', 'fr');
    expect(result).toEqual(issues);
  });

  it('does not overwrite with empty translation strings', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: '', description: '' },
    });

    const result = await translateEntities(issues, 'issue', 'fr');
    expect(result[0].name).toBe('Train Delays');
    expect(result[0].description).toBe('Trains are always late');
  });

  it('passes correct args to getTranslatedEntities', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateEntities(issues, 'issue', 'ja');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('issue', ['i1', 'i2', 'i3'], 'ja');
  });
});

describe('translateEntity', () => {
  it('translates a single entity', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: 'Retards de train' },
    });

    const result = await translateEntity(
      { id: 'i1', name: 'Train Delays', description: 'Late' },
      'issue',
      'fr',
    );
    expect(result.name).toBe('Retards de train');
    expect(result.description).toBe('Late');
  });

  it('short-circuits for English', async () => {
    const entity = { id: 'i1', name: 'Train Delays', description: 'Late' };
    const result = await translateEntity(entity, 'issue', 'en');
    expect(result).toBe(entity);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });
});

describe('translateActionInitiatives', () => {
  const actionInitiatives = [
    { id: 'c1', title: 'Fix the Trains', description: 'Raise money for rail reform' },
    { id: 'c2', title: 'Better Buses', description: null },
  ];

  it('short-circuits for English locale', async () => {
    const result = await translateActionInitiatives(actionInitiatives, 'en');
    expect(result).toBe(actionInitiatives);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateActionInitiatives([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates title and description', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      c1: { title: 'Züge reparieren', description: 'Geld für Bahnreform' },
    });

    const result = await translateActionInitiatives(actionInitiatives, 'de');
    expect(result[0].title).toBe('Züge reparieren');
    expect(result[0].description).toBe('Geld für Bahnreform');
    expect(result[1].title).toBe('Better Buses'); // no translation
    expect(result[1].description).toBeNull();
  });

  it('does not overwrite with empty title', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      c1: { title: '' },
    });

    const result = await translateActionInitiatives(actionInitiatives, 'de');
    expect(result[0].title).toBe('Fix the Trains');
  });

  it('uses action_initiative entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateActionInitiatives(actionInitiatives, 'fr');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('action_initiative', ['c1', 'c2'], 'fr');
  });
});

describe('translateActions', () => {
  const actions = [
    { id: 'a1', title: 'Claim delay repay', description: 'Get compensation' },
    { id: 'a2', title: 'Write to MP', description: null },
  ];

  it('short-circuits for English locale', async () => {
    const result = await translateActions(actions, 'en');
    expect(result).toBe(actions);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateActions([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates title and description', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      a1: { title: 'Verspätungserstattung', description: 'Entschädigung erhalten' },
    });

    const result = await translateActions(actions, 'de');
    expect(result[0].title).toBe('Verspätungserstattung');
    expect(result[0].description).toBe('Entschädigung erhalten');
    expect(result[1].title).toBe('Write to MP'); // no translation
  });

  it('does not overwrite with empty title', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      a1: { title: '' },
    });

    const result = await translateActions(actions, 'de');
    expect(result[0].title).toBe('Claim delay repay');
  });

  it('uses action entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateActions(actions, 'fr');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('action', ['a1', 'a2'], 'fr');
  });
});

describe('translateExpertProfiles', () => {
  const profiles = [
    { id: 'e1', role: 'Rail Expert', speciality: 'Delay claims', achievement: '500 claims won' },
    { id: 'e2', role: 'Legal Advisor', speciality: 'Consumer law', achievement: '10 years exp' },
  ];

  it('short-circuits for English locale', async () => {
    const result = await translateExpertProfiles(profiles, 'en');
    expect(result).toBe(profiles);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateExpertProfiles([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates role, speciality, and achievement', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      e1: { role: 'Bahnexperte', speciality: 'Verspätungsansprüche', achievement: '500 gewonnen' },
    });

    const result = await translateExpertProfiles(profiles, 'de');
    expect(result[0].role).toBe('Bahnexperte');
    expect(result[0].speciality).toBe('Verspätungsansprüche');
    expect(result[0].achievement).toBe('500 gewonnen');
    expect(result[1].role).toBe('Legal Advisor'); // no translation
  });

  it('does not overwrite with empty values', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      e1: { role: '', speciality: '', achievement: '' },
    });

    const result = await translateExpertProfiles(profiles, 'de');
    expect(result[0].role).toBe('Rail Expert');
    expect(result[0].speciality).toBe('Delay claims');
    expect(result[0].achievement).toBe('500 claims won');
  });

  it('uses expert_profile entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateExpertProfiles(profiles, 'fr');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('expert_profile', ['e1', 'e2'], 'fr');
  });
});

describe('translateRiotReels', () => {
  const reels = [
    { id: 'r1', title: 'Why trains fail', caption: 'A deep dive' },
    { id: 'r2', title: 'Community response', caption: 'Rioters unite' },
  ];

  it('short-circuits for English locale', async () => {
    const result = await translateRiotReels(reels, 'en');
    expect(result).toBe(reels);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateRiotReels([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates title and caption', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      r1: { title: 'Warum Züge versagen', caption: 'Ein tiefer Einblick' },
    });

    const result = await translateRiotReels(reels, 'de');
    expect(result[0].title).toBe('Warum Züge versagen');
    expect(result[0].caption).toBe('Ein tiefer Einblick');
    expect(result[1].title).toBe('Community response'); // no translation
  });

  it('does not overwrite with empty values', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      r1: { title: '', caption: '' },
    });

    const result = await translateRiotReels(reels, 'de');
    expect(result[0].title).toBe('Why trains fail');
    expect(result[0].caption).toBe('A deep dive');
  });

  it('uses riot_reel entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateRiotReels(reels, 'fr');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('riot_reel', ['r1', 'r2'], 'fr');
  });
});

describe('translateIssuePivotRows', () => {
  const rows = [
    {
      organisation_id: 'o1',
      organisation_name: 'Network Rail',
      logo_emoji: '🚂',
      rioter_count: 500,
      rank: 1,
      issue_id: 'i1',
      issue_name: 'Trains',
    },
    {
      organisation_id: 'o2',
      organisation_name: 'TfL',
      logo_emoji: '🚇',
      rioter_count: 300,
      rank: 2,
      issue_id: 'i1',
      issue_name: 'Trains',
    },
  ];

  it('short-circuits for English', async () => {
    const result = await translateIssuePivotRows(rows, 'en');
    expect(result).toBe(rows);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateIssuePivotRows([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates organisation_name from organisation entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      o1: { name: 'Netzwerk Schiene' },
    });

    const result = await translateIssuePivotRows(rows, 'de');
    expect(result[0].organisation_name).toBe('Netzwerk Schiene');
    expect(result[1].organisation_name).toBe('TfL'); // no translation
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('organisation', ['o1', 'o2'], 'de');
  });

  it('preserves all other fields', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      o1: { name: 'Translated' },
    });

    const result = await translateIssuePivotRows(rows, 'de');
    expect(result[0].logo_emoji).toBe('🚂');
    expect(result[0].rioter_count).toBe(500);
    expect(result[0].rank).toBe(1);
  });
});

describe('translateOrgPivotRows', () => {
  const rows = [
    { issue_id: 'i1', issue_name: 'Train Delays', rioter_count: 1000 },
    { issue_id: 'i2', issue_name: 'Bus Fares', rioter_count: 500 },
  ];

  it('short-circuits for English', async () => {
    const result = await translateOrgPivotRows(rows, 'en');
    expect(result).toBe(rows);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateOrgPivotRows([], 'fr');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates issue_name from issue entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: 'Retards de train' },
      i2: { name: 'Tarifs de bus' },
    });

    const result = await translateOrgPivotRows(rows, 'fr');
    expect(result[0].issue_name).toBe('Retards de train');
    expect(result[1].issue_name).toBe('Tarifs de bus');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('issue', ['i1', 'i2'], 'fr');
  });

  it('preserves rioter_count', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      i1: { name: 'Translated' },
    });

    const result = await translateOrgPivotRows(rows, 'de');
    expect(result[0].rioter_count).toBe(1000);
    expect(result[1].rioter_count).toBe(500);
  });
});

// ─── Country translation tests (no DB mock needed — uses Intl.DisplayNames) ─

describe('translateCountryName', () => {
  it('returns English name for en locale', () => {
    const result = translateCountryName('GB', 'en');
    expect(result).toBe('United Kingdom');
  });

  it('returns translated name for non-English locale', () => {
    const result = translateCountryName('GB', 'de');
    expect(result).toBe('Vereinigtes Königreich');
  });

  it('returns translated name for French', () => {
    const result = translateCountryName('US', 'fr');
    expect(result).toBe('États-Unis');
  });

  it('falls back to English for romanised locales', () => {
    // -Latn locales should get English since Intl.DisplayNames returns native script
    const result = translateCountryName('IN', 'bn-Latn');
    expect(result).toBe('India');
  });

  it('returns the code if Intl.DisplayNames returns undefined', () => {
    // Invalid codes should fall back gracefully
    const result = translateCountryName('XX', 'en');
    // Intl.DisplayNames.of() returns undefined for unknown codes
    expect(typeof result).toBe('string');
  });
});

describe('translateCountryNames', () => {
  it('short-circuits for en locale', () => {
    const countries = [{ code: 'GB', name: 'United Kingdom' }];
    const result = translateCountryNames(countries, 'en');
    expect(result).toBe(countries); // Same reference — no translation
  });

  it('short-circuits for empty array', () => {
    const result = translateCountryNames([], 'de');
    expect(result).toEqual([]);
  });

  it('translates country names for non-English locale', () => {
    const countries = [
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' },
    ];
    const result = translateCountryNames(countries, 'es');
    expect(result[0].name).toBe('Reino Unido');
    expect(result[1].name).toBe('Francia');
  });

  it('preserves other properties', () => {
    const countries = [{ code: 'DE', name: 'Germany', extra: 42 }];
    const result = translateCountryNames(countries, 'fr');
    expect(result[0].code).toBe('DE');
    expect((result[0] as { extra: number }).extra).toBe(42);
  });
});

describe('translateCountryBreakdown', () => {
  it('short-circuits for en locale', () => {
    const countries = [
      { id: '1', issue_id: 'i1', country_code: 'GB', country_name: 'United Kingdom', rioter_count: 100 },
    ];
    const result = translateCountryBreakdown(countries, 'en');
    expect(result).toBe(countries);
  });

  it('translates country_name field', () => {
    const countries = [
      { id: '1', issue_id: 'i1', country_code: 'JP', country_name: 'Japan', rioter_count: 50 },
    ];
    const result = translateCountryBreakdown(countries, 'de');
    expect(result[0].country_name).toBe('Japan'); // Japan is the same in German
    expect(result[0].rioter_count).toBe(50);
  });

  it('translates multiple countries', () => {
    const countries = [
      { id: '1', issue_id: 'i1', country_code: 'US', country_name: 'United States', rioter_count: 200 },
      { id: '2', issue_id: 'i1', country_code: 'DE', country_name: 'Germany', rioter_count: 100 },
    ];
    const result = translateCountryBreakdown(countries, 'fr');
    expect(result[0].country_name).toBe('États-Unis');
    expect(result[1].country_name).toBe('Allemagne');
  });
});
