# Plan: Fill i18n Test Gaps

## Problem
Several translation surfaces lack test coverage, and category_assistants translations are missing for 43 of 55 non-English locales.

## Phases

### Phase 1: Add category_assistants tests + make field required
- Add tests to `seed-translations.test.ts` for category_assistants section
- Test all 55 non-English locales have `category_assistants` key
- Test all 16 category keys present in each locale
- Test all 7 fields non-empty per category
- Test no HTML/script injection, length limits
- Make `category_assistants` required (not optional) in TranslationFile interface

### Phase 2: Generate missing category_assistants translations
- Run `npm run translate -- --section category_assistants` to fill the 43 missing locales
- Verify JSON validity

### Phase 3: Add empty-value checks for non-English messages/*.json
- Extend messages.test.ts to check that non-English locale files have no empty string values

### Phase 4: Add translation quality spot-check
- For each non-English locale, verify that enough strings differ from English
- Pick strings > 10 chars to avoid false positives on short universal words

### Phase 5: Add romanised locale content validation
- For all 11 -Latn locale message files, verify no native script characters leaked in
- Unicode range checks per locale family

### Phase 6: Run tests, build, commit, push, create PR

## Files Modified
- `scripts/seed-translations.test.ts` — add category_assistants tests
- `scripts/seed-translations.ts` — make category_assistants required in TranslationFile
- `src/i18n/messages.test.ts` — add empty-value, quality, and romanised checks
- `translations/*.json` — fill missing category_assistants (43 locales)
