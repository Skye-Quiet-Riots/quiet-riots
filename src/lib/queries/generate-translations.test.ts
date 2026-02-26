import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the AI module
const mockGenerateEntityTranslations = vi.fn();
vi.mock('@/lib/ai', () => ({
  generateEntityTranslations: mockGenerateEntityTranslations,
  SUPPORTED_LOCALES: ['fr', 'de', 'es'],
}));

// Mock the translations module
const mockUpsertTranslation = vi.fn();
vi.mock('./translations', () => ({
  upsertTranslation: mockUpsertTranslation,
}));

describe('generateAndStoreTranslations', () => {
  beforeEach(() => {
    mockGenerateEntityTranslations.mockReset();
    mockUpsertTranslation.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls generateEntityTranslations and stores results', async () => {
    mockGenerateEntityTranslations.mockResolvedValueOnce({
      fr: { name: 'Frais de scolarité', description: 'Description en français' },
      de: { name: 'Schulgebühren', description: 'Beschreibung auf Deutsch' },
    });
    mockUpsertTranslation.mockResolvedValue(undefined);

    const { generateAndStoreTranslations } = await import('./generate-translations');
    const result = await generateAndStoreTranslations('issue', 'issue-123', {
      name: 'School Fees',
      description: 'High school fees',
    });

    expect(result.success).toBe(true);
    expect(result.localeCount).toBe(2);
    expect(mockUpsertTranslation).toHaveBeenCalledTimes(4); // 2 locales × 2 fields
    expect(mockUpsertTranslation).toHaveBeenCalledWith(
      'issue',
      'issue-123',
      'name',
      'fr',
      'Frais de scolarité',
      'machine',
    );
  });

  it('returns failure when no translations generated', async () => {
    mockGenerateEntityTranslations.mockResolvedValueOnce({});

    const { generateAndStoreTranslations } = await import('./generate-translations');
    const result = await generateAndStoreTranslations('issue', 'issue-123', {
      name: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.localeCount).toBe(0);
    expect(mockUpsertTranslation).not.toHaveBeenCalled();
  });

  it('works for organisations', async () => {
    mockGenerateEntityTranslations.mockResolvedValueOnce({
      es: { name: 'Nombre Org' },
    });
    mockUpsertTranslation.mockResolvedValue(undefined);

    const { generateAndStoreTranslations } = await import('./generate-translations');
    const result = await generateAndStoreTranslations('organisation', 'org-456', {
      name: 'Org Name',
    });

    expect(result.success).toBe(true);
    expect(result.localeCount).toBe(1);
    expect(mockUpsertTranslation).toHaveBeenCalledWith(
      'organisation',
      'org-456',
      'name',
      'es',
      'Nombre Org',
      'machine',
    );
  });

  it('works for action initiatives with title field', async () => {
    mockGenerateEntityTranslations.mockResolvedValueOnce({
      fr: { title: 'Titre', description: 'Desc' },
    });
    mockUpsertTranslation.mockResolvedValue(undefined);

    const { generateAndStoreTranslations } = await import('./generate-translations');
    const result = await generateAndStoreTranslations('action_initiative', 'ai-789', {
      title: 'Title',
      description: 'Description',
    });

    expect(result.success).toBe(true);
    expect(mockUpsertTranslation).toHaveBeenCalledWith(
      'action_initiative',
      'ai-789',
      'title',
      'fr',
      'Titre',
      'machine',
    );
  });

  it('skips empty string values', async () => {
    mockGenerateEntityTranslations.mockResolvedValueOnce({
      fr: { name: 'Bon', description: '' },
    });
    mockUpsertTranslation.mockResolvedValue(undefined);

    const { generateAndStoreTranslations } = await import('./generate-translations');
    await generateAndStoreTranslations('issue', 'issue-123', {
      name: 'Good',
      description: 'Desc',
    });

    // Only the non-empty value should be stored
    expect(mockUpsertTranslation).toHaveBeenCalledTimes(1);
    expect(mockUpsertTranslation).toHaveBeenCalledWith(
      'issue',
      'issue-123',
      'name',
      'fr',
      'Bon',
      'machine',
    );
  });
});
