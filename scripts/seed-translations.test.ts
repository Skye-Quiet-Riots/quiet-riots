import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { routing } from '../src/i18n/routing';
import { CATEGORIES, ISSUES, ORGANISATIONS, type TranslationFile } from './seed-translations';

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

  it.each(nonEnLocales)('%s.json org names are preserved as brand names', (locale) => {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    const data: TranslationFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Organisation names should be kept in original English form
    for (const orgName of ORGANISATIONS.map((o) => o.name)) {
      if (data.organisations[orgName]) {
        expect(
          data.organisations[orgName].name,
          `${locale} org "${orgName}" name should be preserved`,
        ).toBe(orgName);
      }
    }
  });
});
