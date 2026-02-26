import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock for messages.create — stable reference across resetModules()
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe('translateToEnglish', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns original text when source language is English', async () => {
    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('Hello world', 'en');
    expect(result).toBe('Hello world');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns original text when API key is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('Bonjour le monde', 'fr');
    expect(result).toBe('Bonjour le monde');
  });

  it('returns original text for empty input', async () => {
    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('  ', 'fr');
    expect(result).toBe('  ');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls Claude API and returns translation when key is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'School Fees' }],
    });

    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('Okul Ücretleri', 'tr');
    expect(result).toBe('School Fees');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('strips HTML from AI response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '<b>School Fees</b>' }],
    });

    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('Okul Ücretleri', 'tr');
    expect(result).toBe('School Fees');
  });

  it('returns original text on API error (graceful degradation)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(new Error('API error'));

    const { translateToEnglish } = await import('./ai');
    const result = await translateToEnglish('Okul Ücretleri', 'tr');
    expect(result).toBe('Okul Ücretleri');
  });
});

describe('generateEntityTranslations', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns empty object when API key is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations({ name: 'Test', description: 'A test' });
    expect(result).toEqual({});
  });

  it('parses structured JSON response correctly', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const mockResponse = {
      fr: { name: 'Frais de scolarité', description: 'Description en français' },
      de: { name: 'Schulgebühren', description: 'Beschreibung auf Deutsch' },
    };
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
    });

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations(
      { name: 'School Fees', description: 'Description' },
      ['fr', 'de'],
    );
    expect(result.fr.name).toBe('Frais de scolarité');
    expect(result.fr.description).toBe('Description en français');
    expect(result.de.name).toBe('Schulgebühren');
  });

  it('handles markdown-fenced JSON response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const mockResponse = { fr: { name: 'Test', description: 'Desc' } };
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(mockResponse) + '\n```' }],
    });

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations(
      { name: 'Test', description: 'Desc' },
      ['fr'],
    );
    expect(result.fr.name).toBe('Test');
  });

  it('strips HTML from translation values', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ fr: { name: '<b>Test</b>', description: '<p>Desc</p>' } }),
        },
      ],
    });

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations(
      { name: 'Test', description: 'Desc' },
      ['fr'],
    );
    expect(result.fr.name).toBe('Test');
    expect(result.fr.description).toBe('Desc');
  });

  it('skips locales not present in response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: 'text', text: JSON.stringify({ fr: { name: 'Test', description: 'Desc' } }) },
      ],
    });

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations(
      { name: 'Test', description: 'Desc' },
      ['fr', 'de'],
    );
    expect(result.fr).toBeDefined();
    expect(result.de).toBeUndefined();
  });

  it('returns empty object on API error', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(new Error('API error'));

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations({ name: 'Test', description: 'Desc' });
    expect(result).toEqual({});
  });

  it('supports arbitrary field names (e.g. title for campaigns)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ fr: { title: 'Titre', description: 'Desc' } }),
        },
      ],
    });

    const { generateEntityTranslations } = await import('./ai');
    const result = await generateEntityTranslations(
      { title: 'Title', description: 'Desc' },
      ['fr'],
    );
    expect(result.fr.title).toBe('Titre');
  });
});

describe('SUPPORTED_LOCALES', () => {
  it('contains exactly 44 locales', async () => {
    const { SUPPORTED_LOCALES } = await import('./ai');
    expect(SUPPORTED_LOCALES.length).toBe(44);
  });

  it('does not include English', async () => {
    const { SUPPORTED_LOCALES } = await import('./ai');
    expect(SUPPORTED_LOCALES).not.toContain('en');
  });
});
