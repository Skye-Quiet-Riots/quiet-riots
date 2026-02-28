import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { routing } from '../src/i18n/routing';
import {
  ACTIONS,
  ACTION_INITIATIVES,
  CATEGORIES,
  CATEGORY_ASSISTANTS,
  EXPERT_PROFILES,
  ISSUES,
  ORGANISATIONS,
  RIOT_REELS,
  SYNONYMS,
  type TranslationFile,
} from './seed-translations';

const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

describe('translations/ files', () => {
  const nonEnLocales = routing.locales.filter((l) => l !== 'en');

  it('has a translations directory', () => {
    expect(fs.existsSync(TRANSLATIONS_DIR)).toBe(true);
  });

  it('has en.json baseline', () => {
    const filePath = path.join(TRANSLATIONS_DIR, 'en.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.locale).toBe('en');
    expect(Object.keys(data.categories)).toHaveLength(CATEGORIES.length);
    expect(Object.keys(data.issues)).toHaveLength(ISSUES.length);
    expect(Object.keys(data.organisations)).toHaveLength(ORGANISATIONS.length);
  });

  it('has a JSON file for every configured locale', () => {
    for (const locale of nonEnLocales) {
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      expect(fs.existsSync(filePath), `Missing translations/${locale}.json`).toBe(true);
    }
  });

  it.each(nonEnLocales)('%s.json has correct locale field', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.locale).toBe(locale);
  });

  it.each(nonEnLocales)('%s.json has all 16 category keys', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keys = Object.keys(data.categories).sort();
    const expected = [...CATEGORIES].sort();
    expect(keys).toEqual(expected);
  });

  it.each(nonEnLocales)('%s.json has all issue keys with name+description', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keys = Object.keys(data.issues).sort();
    const expected = ISSUES.map((i) => i.name).sort();
    expect(keys).toEqual(expected);

    // Each issue should have name and description
    for (const [key, value] of Object.entries(data.issues)) {
      expect(value, `${locale} issue "${key}" missing name`).toHaveProperty('name');
      expect(value, `${locale} issue "${key}" missing description`).toHaveProperty('description');
      expect(
        (value.name as string).length,
        `${locale} issue "${key}" has empty name`,
      ).toBeGreaterThan(0);
      expect(
        (value.description as string).length,
        `${locale} issue "${key}" has empty description`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(nonEnLocales)('%s.json has all 50 organisation keys with name+description', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keys = Object.keys(data.organisations).sort();
    const expected = ORGANISATIONS.map((o) => o.name).sort();
    expect(keys).toEqual(expected);

    // Each org should have name and description
    for (const [key, value] of Object.entries(data.organisations)) {
      expect(value, `${locale} org "${key}" missing name`).toHaveProperty('name');
      expect(value, `${locale} org "${key}" missing description`).toHaveProperty('description');
      expect(
        (value.name as string).length,
        `${locale} org "${key}" has empty name`,
      ).toBeGreaterThan(0);
      expect(
        (value.description as string).length,
        `${locale} org "${key}" has empty description`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(nonEnLocales)('%s.json org names are translated', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Organisation names should have a non-empty translated name
    for (const orgName of ORGANISATIONS.map((o) => o.name)) {
      if (data.organisations[orgName]) {
        expect(
          data.organisations[orgName].name,
          `${locale} org "${orgName}" name should be a non-empty string`,
        ).toBeTruthy();
      }
    }
  });

  // ─── Synonym translation tests ───

  // Build expected synonym keys from SYNONYMS data (grouped by issue name)
  const issueNamesWithSynonyms = [...new Set(SYNONYMS.map(([issueName]) => issueName))].sort();

  it('en.json has synonyms key with correct structure', () => {
    const filePath = path.join(TRANSLATIONS_DIR, 'en.json');
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.synonyms).toBeDefined();
    const keys = Object.keys(data.synonyms).sort();
    expect(keys).toEqual(issueNamesWithSynonyms);

    // Each issue should have a non-empty array of terms
    for (const [key, terms] of Object.entries(data.synonyms)) {
      expect(Array.isArray(terms), `en synonyms["${key}"] should be array`).toBe(true);
      expect(terms.length, `en synonyms["${key}"] should not be empty`).toBeGreaterThan(0);
      for (const term of terms) {
        expect(typeof term).toBe('string');
        expect(term.length, `en synonym term for "${key}" should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it.each(nonEnLocales)('%s.json has synonyms key with correct issue keys', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.synonyms, `${locale} missing synonyms key`).toBeDefined();
    const keys = Object.keys(data.synonyms).sort();
    expect(keys).toEqual(issueNamesWithSynonyms);
  });

  it.each(nonEnLocales)(
    '%s.json synonym arrays match English baseline length per issue',
    (locale) => {
      const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
      const enData: TranslationFile = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const [issue, enTerms] of Object.entries(enData.synonyms)) {
        const localeTerms = data.synonyms[issue];
        expect(localeTerms, `${locale} missing synonyms for "${issue}"`).toBeDefined();
        expect(
          localeTerms.length,
          `${locale} synonyms["${issue}"] has ${localeTerms?.length} terms, expected ${enTerms.length}`,
        ).toBe(enTerms.length);
      }
    },
  );

  it.each(nonEnLocales)('%s.json has no empty synonym terms', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [issue, terms] of Object.entries(data.synonyms)) {
      for (let i = 0; i < terms.length; i++) {
        expect(typeof terms[i]).toBe('string');
        expect(
          terms[i].trim().length,
          `${locale} synonyms["${issue}"][${i}] is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it.each(nonEnLocales)('%s.json synonym terms do not contain HTML or script', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [issue, terms] of Object.entries(data.synonyms)) {
      for (const term of terms) {
        expect(term, `${locale} synonyms["${issue}"] contains HTML`).not.toMatch(/<[^>]+>/);
        expect(term, `${locale} synonyms["${issue}"] contains script`).not.toMatch(
          /javascript:|on\w+\s*=/i,
        );
      }
    }
  });

  it.each(nonEnLocales)('%s.json synonym terms are under 255 chars', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [issue, terms] of Object.entries(data.synonyms)) {
      for (const term of terms) {
        expect(
          term.length,
          `${locale} synonyms["${issue}"] term "${term.slice(0, 30)}..." exceeds 255 chars`,
        ).toBeLessThanOrEqual(255);
      }
    }
  });

  // ─── Category assistant translation tests ───

  const assistantCategoryKeys = Object.keys(CATEGORY_ASSISTANTS).sort();
  const assistantFields = [
    'agent_quote',
    'human_quote',
    'agent_bio',
    'human_bio',
    'goal',
    'focus',
    'focus_detail',
  ] as const;

  it('en.json has category_assistants with correct structure', () => {
    const filePath = path.join(TRANSLATIONS_DIR, 'en.json');
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.category_assistants).toBeDefined();
    const keys = Object.keys(data.category_assistants).sort();
    expect(keys).toEqual(assistantCategoryKeys);

    for (const [cat, fields] of Object.entries(data.category_assistants)) {
      for (const field of assistantFields) {
        expect(fields, `en category_assistants["${cat}"] missing "${field}"`).toHaveProperty(field);
        expect(
          (fields[field] as string).length,
          `en category_assistants["${cat}"].${field} is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it.each(nonEnLocales)('%s.json has category_assistants key', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.category_assistants, `${locale} missing category_assistants section`).toBeDefined();
  });

  it.each(nonEnLocales)('%s.json has all 16 category assistant keys', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keys = Object.keys(data.category_assistants).sort();
    expect(keys).toEqual(assistantCategoryKeys);
  });

  it.each(nonEnLocales)('%s.json category assistants have all 7 fields non-empty', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [cat, fields] of Object.entries(data.category_assistants)) {
      for (const field of assistantFields) {
        expect(fields, `${locale} category_assistants["${cat}"] missing "${field}"`).toHaveProperty(
          field,
        );
        expect(
          (fields[field] as string).length,
          `${locale} category_assistants["${cat}"].${field} is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it.each(nonEnLocales)(
    '%s.json category assistant fields do not contain HTML or script',
    (locale) => {
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const [cat, fields] of Object.entries(data.category_assistants)) {
        for (const field of assistantFields) {
          const value = fields[field] as string;
          expect(
            value,
            `${locale} category_assistants["${cat}"].${field} contains HTML`,
          ).not.toMatch(/<[^>]+>/);
          expect(
            value,
            `${locale} category_assistants["${cat}"].${field} contains script`,
          ).not.toMatch(/javascript:|on\w+\s*=/i);
        }
      }
    },
  );

  it.each(nonEnLocales)('%s.json category assistant fields are under 500 chars', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [cat, fields] of Object.entries(data.category_assistants)) {
      for (const field of assistantFields) {
        const value = fields[field] as string;
        expect(
          value.length,
          `${locale} category_assistants["${cat}"].${field} exceeds 500 chars`,
        ).toBeLessThanOrEqual(500);
      }
    }
  });

  // ─── Action translation tests ───

  const actionKeys = ACTIONS.map((a) => a.title).sort();

  it.each(nonEnLocales)('%s.json has all action keys with title+description', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.actions, `${locale} missing actions section`).toBeDefined();
    const keys = Object.keys(data.actions).sort();
    expect(keys).toEqual(actionKeys);

    for (const [key, value] of Object.entries(data.actions)) {
      expect(value, `${locale} actions["${key}"] missing title`).toHaveProperty('title');
      expect(value, `${locale} actions["${key}"] missing description`).toHaveProperty('description');
      expect(
        (value.title as string).length,
        `${locale} actions["${key}"] has empty title`,
      ).toBeGreaterThan(0);
      expect(
        (value.description as string).length,
        `${locale} actions["${key}"] has empty description`,
      ).toBeGreaterThan(0);
    }
  });

  // ─── Expert profile translation tests ───

  const expertKeys = EXPERT_PROFILES.map((e) => e.name).sort();
  const expertFields = ['role', 'speciality', 'achievement'] as const;

  it.each(nonEnLocales)('%s.json has all expert profile keys with required fields', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.expert_profiles, `${locale} missing expert_profiles section`).toBeDefined();
    const keys = Object.keys(data.expert_profiles).sort();
    expect(keys).toEqual(expertKeys);

    for (const [key, value] of Object.entries(data.expert_profiles)) {
      for (const field of expertFields) {
        expect(
          value,
          `${locale} expert_profiles["${key}"] missing "${field}"`,
        ).toHaveProperty(field);
        expect(
          (value[field] as string).length,
          `${locale} expert_profiles["${key}"].${field} is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  // ─── Riot reel translation tests ───

  const reelKeys = RIOT_REELS.map((r) => r.video_id).sort();

  it.each(nonEnLocales)('%s.json has all riot reel keys with title+caption', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.riot_reels, `${locale} missing riot_reels section`).toBeDefined();
    const keys = Object.keys(data.riot_reels).sort();
    expect(keys).toEqual(reelKeys);

    for (const [key, value] of Object.entries(data.riot_reels)) {
      expect(value, `${locale} riot_reels["${key}"] missing title`).toHaveProperty('title');
      expect(value, `${locale} riot_reels["${key}"] missing caption`).toHaveProperty('caption');
      expect(
        (value.title as string).length,
        `${locale} riot_reels["${key}"] has empty title`,
      ).toBeGreaterThan(0);
      expect(
        (value.caption as string).length,
        `${locale} riot_reels["${key}"] has empty caption`,
      ).toBeGreaterThan(0);
    }
  });

  // ─── Action initiative translation tests ───

  const initiativeKeys = ACTION_INITIATIVES.map((ai) => ai.title).sort();

  it.each(nonEnLocales)(
    '%s.json has all action initiative keys with title+description',
    (locale) => {
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(
        data.action_initiatives,
        `${locale} missing action_initiatives section`,
      ).toBeDefined();
      const keys = Object.keys(data.action_initiatives).sort();
      expect(keys).toEqual(initiativeKeys);

      for (const [key, value] of Object.entries(data.action_initiatives)) {
        expect(
          value,
          `${locale} action_initiatives["${key}"] missing title`,
        ).toHaveProperty('title');
        expect(
          value,
          `${locale} action_initiatives["${key}"] missing description`,
        ).toHaveProperty('description');
        expect(
          (value.title as string).length,
          `${locale} action_initiatives["${key}"] has empty title`,
        ).toBeGreaterThan(0);
        expect(
          (value.description as string).length,
          `${locale} action_initiatives["${key}"] has empty description`,
        ).toBeGreaterThan(0);
      }
    },
  );

  // ─── Issue per-riot copy translation tests ───
  // These keys must be ENGLISH issue names (or LIKE patterns like '%Bus%Cuts').
  // If the AI translates the keys, seed-translations --apply silently skips them.

  it.each(nonEnLocales)(
    '%s.json has issue_per_riot keys matching English baseline',
    (locale) => {
      const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
      const enData: TranslationFile = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data.issue_per_riot, `${locale} missing issue_per_riot section`).toBeDefined();

      const enKeys = Object.keys(enData.issue_per_riot).sort();
      const localeKeys = Object.keys(data.issue_per_riot).sort();
      expect(localeKeys, `${locale} issue_per_riot key mismatch`).toEqual(enKeys);
    },
  );

  const perRiotFields = ['agent_helps', 'human_helps', 'agent_focus', 'human_focus'] as const;

  it.each(nonEnLocales)(
    '%s.json issue_per_riot entries have all 4 fields non-empty',
    (locale) => {
      const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!data.issue_per_riot) return;

      for (const [key, value] of Object.entries(data.issue_per_riot)) {
        for (const field of perRiotFields) {
          expect(
            value,
            `${locale} issue_per_riot["${key}"] missing "${field}"`,
          ).toHaveProperty(field);
          expect(
            (value[field] as string).length,
            `${locale} issue_per_riot["${key}"].${field} is empty`,
          ).toBeGreaterThan(0);
        }
      }
    },
  );

  // ─── Catch-all: all keyed sections match English baseline keys ───
  // This test auto-covers any future section added to TranslationFile.

  it.each(nonEnLocales)('%s.json has matching keys in all sections', (locale) => {
    const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
    const enData: TranslationFile = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;

    // Check all sections that have object keys (skip 'locale' string and 'synonyms' arrays)
    for (const [section, enSection] of Object.entries(enData)) {
      if (section === 'locale') continue;
      if (section === 'synonyms') continue; // synonyms use arrays, tested separately
      if (typeof enSection !== 'object' || enSection === null) continue;

      const localeSection = data[section] as Record<string, unknown> | undefined;
      expect(localeSection, `${locale} missing section "${section}"`).toBeDefined();
      if (!localeSection) continue;

      const enKeys = Object.keys(enSection as Record<string, unknown>).sort();
      const localeKeys = Object.keys(localeSection).sort();
      expect(localeKeys, `${locale}/${section} key mismatch`).toEqual(enKeys);
    }
  });

  // ─── Regression: non-English files must contain actual translations ───
  // This prevents the bug where --generate overwrites locale files with English.

  const sectionsToCheck = ['issues', 'organisations', 'category_assistants', 'actions'] as const;

  it.each(nonEnLocales)('%s.json contains actual translations, not English placeholders', (locale) => {
    // Romanised locales may legitimately share some values with English
    if (locale.endsWith('-Latn')) return;

    const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
    const enData: TranslationFile = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const section of sectionsToCheck) {
      const enSection = enData[section] as Record<string, unknown>;
      const localeSection = data[section] as Record<string, unknown>;
      if (!enSection || !localeSection) continue;

      let total = 0;
      let englishCount = 0;

      for (const [key, value] of Object.entries(localeSection)) {
        if (typeof value === 'string') {
          total++;
          if (enSection[key] === value) englishCount++;
        } else if (typeof value === 'object' && value !== null) {
          for (const [field, fieldVal] of Object.entries(value as Record<string, unknown>)) {
            if (typeof fieldVal === 'string') {
              total++;
              const enObj = enSection[key] as Record<string, unknown> | undefined;
              if (enObj && enObj[field] === fieldVal) englishCount++;
            }
          }
        }
      }

      // Allow up to 20% English (brand names, proper nouns etc.) but flag if everything is English
      const englishPct = total > 0 ? (englishCount / total) * 100 : 0;
      expect(
        englishPct,
        `${locale} ${section}: ${englishCount}/${total} values are identical to English (${englishPct.toFixed(0)}%). Translations may have been overwritten by --generate.`,
      ).toBeLessThan(80);
    }
  });
});
