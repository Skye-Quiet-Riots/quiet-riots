# Fix Entity Name Translations + Bot Label Translation

## Problem

The WhatsApp bot shows English text in non-English conversations:
1. **Issue names** ("Train Cancellations") are untranslated in ALL 55 locale translation files — the `name` value is identical to the English key
2. **Organisation names** same problem — names are English in all locales
3. **Bot template labels** ("AI Agent", "Human Organiser", "Trending", "Quiet Rioters across X countries") — SKILL.md tells the bot to translate these, but it's not doing it consistently

## Root Cause

- `translate.ts` prompt says "Translate ONLY the string values. Keep ALL JSON keys exactly as they are." The AI model sees `"Train Cancellations": { "name": "Train Cancellations", ... }` and doesn't translate the `name` value because it looks like the key/reference.
- SKILL.md has correct instructions for label translation but the bot doesn't follow them consistently — the instructions are too far from the template examples.

## Plan

### Phase 1: Fix translate.ts prompt

Add explicit instruction to `buildPrompt()`:
- "The `name` field values inside issues and organisations ARE user-facing display names — translate them into the target language. They are NOT lookup keys. Do NOT leave them in English."
- This ensures current and future translation runs produce correct entity name translations.

### Phase 2: Re-run translation pipeline

```bash
npm run translate -- --section issues --section organisations
```

- Regenerates all 55 locales with actually translated names.
- Verify a sample of files to confirm names are translated.
- Run JSON validation on all files.

### Phase 3: Update SKILL.md

- Add a "Labels that MUST be translated" reference near the template examples
- Add inline translated label examples for common labels in a few languages
- Move/reinforce the label translation instruction closer to where templates are defined

### Phase 4: Apply to DB + deploy

- Apply translations to staging DB via `seed-translations.ts --apply`
- Run tests + build
- Create PR, wait for CI, merge
- Apply translations to production DB
- Verify deployment

## Files Changed

- `scripts/translate.ts` — prompt improvement
- `translations/*.json` (55 files) — regenerated issue + org name translations
- `~/.openclaw/skills/quiet-riots/SKILL.md` — stronger label translation instructions
