import { describe, it, expect } from 'vitest';
import {
  extractPlaceholders,
  collectStringValues,
  validateTranslation,
  normalizeTranslatedKeys,
  BRAND_NAMES,
  MAX_LENGTHS,
} from './translate-validation';

describe('extractPlaceholders', () => {
  it('extracts single placeholder', () => {
    expect(extractPlaceholders('Hello {name}')).toEqual(['{name}']);
  });

  it('extracts multiple placeholders', () => {
    expect(extractPlaceholders('{count} issues found by {user}')).toEqual(['{count}', '{user}']);
  });

  it('returns empty array for no placeholders', () => {
    expect(extractPlaceholders('No placeholders here')).toEqual([]);
  });

  it('handles empty string', () => {
    expect(extractPlaceholders('')).toEqual([]);
  });
});

describe('collectStringValues', () => {
  it('collects flat string', () => {
    expect(collectStringValues('hello', 'root')).toEqual([{ path: 'root', value: 'hello' }]);
  });

  it('collects from object', () => {
    const result = collectStringValues({ name: 'Alice', age: 30 });
    expect(result).toEqual([{ path: 'name', value: 'Alice' }]);
  });

  it('collects from nested object', () => {
    const result = collectStringValues({
      issue: { name: 'Train', description: 'Delayed' },
    });
    expect(result).toContainEqual({ path: 'issue.name', value: 'Train' });
    expect(result).toContainEqual({ path: 'issue.description', value: 'Delayed' });
  });

  it('collects from array', () => {
    const result = collectStringValues(['a', 'b'], 'arr');
    expect(result).toEqual([
      { path: 'arr[0]', value: 'a' },
      { path: 'arr[1]', value: 'b' },
    ]);
  });
});

describe('BRAND_NAMES', () => {
  it('contains expected brand names', () => {
    expect(BRAND_NAMES).toContain('Quiet Riot');
    expect(BRAND_NAMES).toContain('Quiet Riots');
    expect(BRAND_NAMES).toContain('Quiet Rioters');
  });
});

describe('MAX_LENGTHS', () => {
  it('defines limits for all sections', () => {
    const sections = [
      'categories',
      'issues',
      'organisations',
      'synonyms',
      'category_assistants',
      'actions',
      'expert_profiles',
      'riot_reels',
      'action_initiatives',
    ];
    for (const section of sections) {
      expect(MAX_LENGTHS[section]).toBeDefined();
    }
  });

  it('has correct limits for issues', () => {
    expect(MAX_LENGTHS.issues.name).toBe(255);
    expect(MAX_LENGTHS.issues.description).toBe(2000);
  });
});

describe('validateTranslation', () => {
  // 1. Key structure validation
  it('passes for matching keys', () => {
    const original = { foo: 'bar', baz: 'qux' };
    const translated = { foo: 'barre', baz: 'cux' };
    const errors = validateTranslation(original, translated, 'test', 'fr');
    expect(errors).toEqual([]);
  });

  it('detects missing keys', () => {
    const original = { foo: 'bar', baz: 'qux' };
    const translated = { foo: 'barre' };
    const errors = validateTranslation(original, translated, 'test', 'fr');
    expect(errors.some((e) => e.includes('Missing key "baz"'))).toBe(true);
  });

  it('detects extra keys', () => {
    const original = { foo: 'bar' };
    const translated = { foo: 'barre', extra: 'val' };
    const errors = validateTranslation(original, translated, 'test', 'fr');
    expect(errors.some((e) => e.includes('Extra key "extra"'))).toBe(true);
  });

  it('detects key count mismatch', () => {
    const original = { a: '1', b: '2' };
    const translated = { a: '1' };
    const errors = validateTranslation(original, translated, 'test', 'fr');
    expect(errors.some((e) => e.includes('Key count mismatch'))).toBe(true);
  });

  // 2. Deep structure validation
  it('detects nested key mismatch', () => {
    const original = { issue: { name: 'Train', description: 'Delayed' } };
    const translated = { issue: { name: 'Tren' } }; // missing description
    const errors = validateTranslation(
      original as Record<string, unknown>,
      translated as Record<string, unknown>,
      'test',
      'es',
    );
    expect(errors.some((e) => e.includes('Nested key mismatch'))).toBe(true);
  });

  it('detects type mismatch (object expected, got string)', () => {
    const original = { issue: { name: 'Train' } };
    const translated = { issue: 'Tren' };
    const errors = validateTranslation(
      original as Record<string, unknown>,
      translated as Record<string, unknown>,
      'test',
      'es',
    );
    expect(errors.some((e) => e.includes('Expected object'))).toBe(true);
  });

  // 3. Placeholder preservation
  it('passes when placeholders are preserved', () => {
    const original = { msg: 'Hello {name}, you have {count} issues' };
    const translated = { msg: 'Hola {name}, tienes {count} problemas' };
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.filter((e) => e.includes('placeholder'))).toEqual([]);
  });

  it('detects missing placeholder', () => {
    const original = { msg: 'Hello {name}' };
    const translated = { msg: 'Hola nombre' }; // {name} missing
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.some((e) => e.includes('Missing placeholder {name}'))).toBe(true);
  });

  it('ignores strings without placeholders', () => {
    const original = { msg: 'No placeholders' };
    const translated = { msg: 'Sin marcadores' };
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.filter((e) => e.includes('placeholder'))).toEqual([]);
  });

  // 4. Brand name preservation
  it('passes when brand names are preserved', () => {
    const original = { bio: 'Join Quiet Riots today' };
    const translated = { bio: 'Únete a Quiet Riots hoy' };
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.filter((e) => e.includes('Brand name'))).toEqual([]);
  });

  it('detects translated brand name', () => {
    const original = { bio: 'Join Quiet Riots today' };
    const translated = { bio: 'Únete a Disturbios Silenciosos hoy' };
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.some((e) => e.includes('Brand name "Quiet Riots"'))).toBe(true);
  });

  it('checks all brand name variants', () => {
    const original = { a: 'Quiet Riot members', b: 'Quiet Rioters unite' };
    const translated = { a: 'Miembros de Riot Tranquilo', b: 'Manifestantes Tranquilos' };
    const errors = validateTranslation(original, translated, 'test', 'es');
    expect(errors.some((e) => e.includes('"Quiet Riot"'))).toBe(true);
    expect(errors.some((e) => e.includes('"Quiet Rioters"'))).toBe(true);
  });

  // 5. Max-length validation
  it('passes for values under max length', () => {
    const original = { 'Train Cancellations': { name: 'Train Cancellations', description: 'Trains are late' } };
    const translated = { 'Train Cancellations': { name: 'Annulations de trains', description: 'Les trains sont en retard' } };
    const errors = validateTranslation(
      original as Record<string, unknown>,
      translated as Record<string, unknown>,
      'issues',
      'fr',
    );
    expect(errors.filter((e) => e.includes('Exceeds max length'))).toEqual([]);
  });

  it('detects values exceeding max length', () => {
    const longName = 'A'.repeat(300);
    const original = { 'Test': { name: 'Short', description: 'Short desc' } };
    const translated = { 'Test': { name: longName, description: 'Desc courte' } };
    const errors = validateTranslation(
      original as Record<string, unknown>,
      translated as Record<string, unknown>,
      'issues',
      'fr',
    );
    expect(errors.some((e) => e.includes('Exceeds max length 255'))).toBe(true);
  });

  it('skips max-length check for sections without defined limits', () => {
    const original = { key: 'A'.repeat(5000) };
    const translated = { key: 'B'.repeat(5000) };
    const errors = validateTranslation(original, translated, 'unknown_section', 'fr');
    expect(errors.filter((e) => e.includes('Exceeds max length'))).toEqual([]);
  });

  // Combined validation
  it('reports multiple errors', () => {
    const original = {
      'Issue 1': { name: 'Hello {name} from Quiet Riots', description: 'Desc' },
      'Issue 2': { name: 'Another', description: 'More' },
    };
    const translated = {
      'Issue 1': { name: 'Hola nombre de Disturbios', description: 'Desc' }, // missing {name}, missing brand
      // Missing Issue 2
    };
    const errors = validateTranslation(
      original as Record<string, unknown>,
      translated as Record<string, unknown>,
      'issues',
      'es',
    );
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('normalizeTranslatedKeys', () => {
  it('keeps keys matching English baseline as-is', () => {
    const en = { 'Train Cancellations': { agent_helps: 'help' } };
    const translated = { 'Train Cancellations': { agent_helps: 'ayuda' } };
    const { normalized, fixes } = normalizeTranslatedKeys('issue_per_riot', en, translated, {});
    expect(normalized).toEqual({ 'Train Cancellations': { agent_helps: 'ayuda' } });
    expect(fixes).toEqual([]);
  });

  it('remaps translated issue_per_riot key via reverse lookup', () => {
    const en = { 'Flight Delays': { agent_helps: 'help' } };
    const translated = { 'Retrasos en Vuelos': { agent_helps: 'ayuda con vuelos' } };
    const localeData = {
      issues: { 'Flight Delays': { name: 'Retrasos en Vuelos', description: 'desc' } },
    };
    const { normalized, fixes } = normalizeTranslatedKeys(
      'issue_per_riot',
      en,
      translated,
      localeData,
    );
    expect(normalized['Flight Delays']).toEqual({ agent_helps: 'ayuda con vuelos' });
    expect(normalized['Retrasos en Vuelos']).toBeUndefined();
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toContain('Remapped');
  });

  it('warns about unknown key in issue_per_riot with no reverse match', () => {
    const en = { 'Train Cancellations': { agent_helps: 'help' } };
    const translated = { 'Something Random': { agent_helps: 'random' } };
    const { normalized, fixes } = normalizeTranslatedKeys(
      'issue_per_riot',
      en,
      translated,
      { issues: {} },
    );
    // Keeps the unknown key
    expect(normalized['Something Random']).toEqual({ agent_helps: 'random' });
    // Also fills the missing English key
    expect(normalized['Train Cancellations']).toEqual({ agent_helps: 'help' });
    expect(fixes).toHaveLength(2);
    expect(fixes[0]).toContain('Unknown key');
    expect(fixes[1]).toContain('Missing key');
  });

  it('fills missing English keys with baseline values', () => {
    const en = {
      'Train Cancellations': { agent_helps: 'train help' },
      'Flight Delays': { agent_helps: 'flight help' },
    };
    const translated = { 'Train Cancellations': { agent_helps: 'ayuda trenes' } };
    const { normalized, fixes } = normalizeTranslatedKeys('issue_per_riot', en, translated, {});
    expect(normalized['Flight Delays']).toEqual({ agent_helps: 'flight help' });
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toContain('Missing key "Flight Delays"');
  });

  it('keeps LIKE pattern keys as-is (literal strings)', () => {
    const en = {
      '%Bus%Cuts': { agent_helps: 'bus help' },
      '%Sewage in Rivers%': { agent_helps: 'sewage help' },
    };
    const translated = {
      '%Bus%Cuts': { agent_helps: 'ayuda autobús' },
      '%Sewage in Rivers%': { agent_helps: 'ayuda aguas residuales' },
    };
    const { normalized, fixes } = normalizeTranslatedKeys('issue_per_riot', en, translated, {});
    expect(normalized['%Bus%Cuts']).toEqual({ agent_helps: 'ayuda autobús' });
    expect(normalized['%Sewage in Rivers%']).toEqual({ agent_helps: 'ayuda aguas residuales' });
    expect(fixes).toEqual([]);
  });

  it('warns but does not auto-fix non-issue_per_riot section with wrong key', () => {
    const en = { 'expert-1': { role: 'Expert' } };
    const translated = { 'experto-1': { role: 'Experto' } };
    const { normalized, fixes } = normalizeTranslatedKeys('expert_profiles', en, translated, {});
    // Keeps the wrong key as-is
    expect(normalized['experto-1']).toEqual({ role: 'Experto' });
    // Also fills the missing English key
    expect(normalized['expert-1']).toEqual({ role: 'Expert' });
    expect(fixes).toHaveLength(2);
    expect(fixes[0]).toContain('Unknown key "experto-1" in expert_profiles');
    expect(fixes[1]).toContain('Missing key "expert-1"');
  });

  it('handles mixed correct and incorrect keys', () => {
    const en = {
      'Train Cancellations': { agent_helps: 'train help' },
      'Flight Delays': { agent_helps: 'flight help' },
      'Energy Bills': { agent_helps: 'energy help' },
    };
    const translated = {
      'Train Cancellations': { agent_helps: 'ayuda trenes' },
      'Retrasos en Vuelos': { agent_helps: 'ayuda vuelos' },
      'Energy Bills': { agent_helps: 'ayuda energía' },
    };
    const localeData = {
      issues: { 'Flight Delays': { name: 'Retrasos en Vuelos', description: 'desc' } },
    };
    const { normalized, fixes } = normalizeTranslatedKeys(
      'issue_per_riot',
      en,
      translated,
      localeData,
    );
    expect(Object.keys(normalized).sort()).toEqual(
      ['Energy Bills', 'Flight Delays', 'Train Cancellations'].sort(),
    );
    expect(normalized['Flight Delays']).toEqual({ agent_helps: 'ayuda vuelos' });
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toContain('Remapped');
  });
});
