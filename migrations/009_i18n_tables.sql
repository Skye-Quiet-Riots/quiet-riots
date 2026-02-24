-- Migration 009: i18n reference tables + translations
-- Languages, countries, and a generic translations table for all entity content

CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) <= 100),
  native_name TEXT NOT NULL CHECK(length(native_name) <= 100),
  direction TEXT NOT NULL DEFAULT 'ltr' CHECK(direction IN ('ltr', 'rtl'))
);

CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) <= 100),
  default_language TEXT REFERENCES languages(code),
  currency_code TEXT CHECK(length(currency_code) <= 3),
  phone_prefix TEXT CHECK(length(phone_prefix) <= 10)
);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type TEXT NOT NULL CHECK(length(entity_type) <= 50),
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL CHECK(length(field) <= 50),
  language_code TEXT NOT NULL REFERENCES languages(code),
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'machine', 'reviewed')),
  UNIQUE(entity_type, entity_id, field, language_code)
);

-- Indexes for translation lookups
CREATE INDEX IF NOT EXISTS idx_translations_lookup ON translations(entity_type, entity_id, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(language_code, entity_type);
