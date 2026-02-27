import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { routing } from '../src/i18n/routing';
import {
  CATEGORIES,
  CATEGORY_ASSISTANTS,
  ISSUES,
  ORGANISATIONS,
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

  it.each(nonEnLocales)('%s.json has all 49 issue keys with name+description', (locale) => {
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
});
