# Plan: Fix Translation Overwrite Bug

## Problem

`seed-translations.ts --generate` overwrites ALL locale files with English baseline copies. When `npm run translate` is then run for only a NEW section, all previously translated sections get replaced with English. This destroyed translations across 9 sections for all 55 locales in PR #149.

Evidence: `translations/es.json` has 0% translated content for issues, organisations, category_assistants, actions, expert_profiles, riot_reels, action_initiatives, synonyms, and categories. Only `issue_per_riot` (the section translated in PR #149) has actual translations.

## Phase 1: Fix `--generate` to be additive

Modify `seed-translations.ts` so `--generate` MERGES new keys into existing locale files instead of overwriting them. Only write English baseline for keys that don't already exist in the locale file. Always overwrite `en.json` (the English baseline).

**File:** `scripts/seed-translations.ts` (lines ~1258-1280)

## Phase 2: Retranslate all damaged sections

Run `npm run translate -- --all` to regenerate translations for all sections across 55 locales. Validate all JSON files. Spot-check: es.json should have Spanish, ar.json should have Arabic.

## Phase 3: Apply to databases

Apply to staging + production DBs via `seed-translations.ts --apply`.

## Phase 4: Regression test

Add test that verifies non-English locale translation files don't have all-English values in translated sections.

## Phase 5: PR, merge, deploy
