import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  translateEntities,
  translateEntity,
  translateCampaigns,
  translateIssuePivotRows,
  translateOrgPivotRows,
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

describe('translateCampaigns', () => {
  const campaigns = [
    { id: 'c1', title: 'Fix the Trains', description: 'Raise money for rail reform' },
    { id: 'c2', title: 'Better Buses', description: null },
  ];

  it('short-circuits for English locale', async () => {
    const result = await translateCampaigns(campaigns, 'en');
    expect(result).toBe(campaigns);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('short-circuits for empty array', async () => {
    const result = await translateCampaigns([], 'de');
    expect(result).toEqual([]);
    expect(mockGetTranslatedEntities).not.toHaveBeenCalled();
  });

  it('translates title and description', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      c1: { title: 'Züge reparieren', description: 'Geld für Bahnreform' },
    });

    const result = await translateCampaigns(campaigns, 'de');
    expect(result[0].title).toBe('Züge reparieren');
    expect(result[0].description).toBe('Geld für Bahnreform');
    expect(result[1].title).toBe('Better Buses'); // no translation
    expect(result[1].description).toBeNull();
  });

  it('does not overwrite with empty title', async () => {
    mockGetTranslatedEntities.mockResolvedValue({
      c1: { title: '' },
    });

    const result = await translateCampaigns(campaigns, 'de');
    expect(result[0].title).toBe('Fix the Trains');
  });

  it('uses campaign entity type', async () => {
    mockGetTranslatedEntities.mockResolvedValue({});

    await translateCampaigns(campaigns, 'fr');
    expect(mockGetTranslatedEntities).toHaveBeenCalledWith('campaign', ['c1', 'c2'], 'fr');
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
