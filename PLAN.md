# i18n Architecture Fixes + Security Hardening

## Context

Quiet Riots supports 56 locales. Several i18n gaps exist: untranslated entity types (actions, experts, reels, action initiatives), country names are English-only, nav-bar has hardcoded English, `<html lang="en">` is hardcoded, and sanitization is missing for some entity types in the translation pipeline.

This plan fixes all known i18n bugs, extends the translation pipeline to all user-visible DB entities, adds country name translations, and hardens security. **Phase 3 (adding 40 new locales) is deferred** pending liability review.

## Senior Engineer Review Fixes Applied

1. **Phase 0a**: Use dynamic `lang` via request headers instead of restructuring layouts (Next.js requires `<html>` in root layout)
2. **Security first**: Sanitization fix moved from Phase 4 into Phase 0 (don't generate new translations on unsanitized data)
3. **Cache fix**: Countries API needs `Vary` header or URL-based cache key to prevent cross-locale pollution
4. **Country names**: Evaluate `Intl.DisplayNames` as primary source (no DB rows needed for most locales)
5. **Explicit nav-bar mapping**: Listed every hardcoded string with its key and whether new/existing
6. **Actions use `title` not `name`**: `translateActions()` must follow `translateActionInitiatives()` pattern, NOT `translateEntities()`
7. **Riot reel titles**: Only curated/seeded reel titles are translated; community-submitted reels keep YouTube titles
8. **Phase 4c deferred**: Concurrency reduction, retry-failed flag, and romanised cleanup only needed when Phase 3 happens

---

## Phase 0: Fix Existing i18n Bugs + Sanitization (1 PR)

### 0a. Fix `<html lang="en">` hardcoded — dynamic via headers
- **`src/app/layout.tsx`**: Make root layout an async server component. Read locale from `headers().get('x-next-intl-locale')` or parse from URL. Set `<html lang={locale} dir={dir}>` dynamically.
- Keep `<html>` and `<body>` in root layout (Next.js requirement). Do NOT move them to `[locale]/layout.tsx`.
- Remove the hardcoded `lang="en"` and `dir` setting from `[locale]/layout.tsx`'s wrapper div (it will be on `<html>` now).
- Verify fonts, Sentry, PostHog, AuthProvider still work.

### 0b. Wire nav-bar hardcoded strings (9 instances)

**NEW keys to add to `messages/en.json` Nav namespace:**
- `inbox` → "Inbox"
- `setupGuide` → "Setup Guide"

**EXISTING keys to wire up (already in en.json):**
- `myShare` → "My Share" (2 locations: desktop line ~186, mobile line ~318)
- `shareGuide` → "Share Guide" (1 location: desktop line ~203)
- `compliance` → "Compliance" (1 location: desktop line ~212)
- `treasury` → "Treasury" (1 location: desktop line ~221)

**All instances:**
1. `aria-label="Inbox"` on icon → `aria-label={t('inbox')}`
2. `Inbox` in desktop dropdown → `{t('inbox')}`
3. `My Share` in desktop dropdown → `{t('myShare')}`
4. `Setup Guide` in desktop dropdown → `{t('setupGuide')}`
5. `Share Guide` in desktop dropdown → `{t('shareGuide')}`
6. `Compliance` in desktop dropdown → `{t('compliance')}`
7. `Treasury` in desktop dropdown → `{t('treasury')}`
8. `Inbox` in mobile menu → `{t('inbox')}`
9. `My Share` in mobile menu → `{t('myShare')}`

**All 55 non-English `messages/*.json`**: Translate `inbox` and `setupGuide` via script.

### 0c. Fix sanitization gap (moved from Phase 4)
- **`scripts/seed-translations.ts`**: Apply `sanitizeText()` to ALL entity types in `applyTranslations()`. Currently only synonyms + category_assistants are sanitized. Add sanitization for issues and organisations.
- Add allowlist validation: reject any translation containing HTML tags (`/<[^>]+>/g`), `javascript:`, `data:`, `vbscript:` URL schemes.
- This MUST happen before Phase 1 generates new translations.

### 0d. Tests
- Test `<html lang>` matches locale for en, ar, fr (including dir="rtl" for Arabic)
- Test Nav namespace has all required keys: `inbox`, `setupGuide`, `myShare`, `shareGuide`, `compliance`, `treasury`
- Test sanitization rejects HTML tags and dangerous URL schemes
- Test sanitization is applied to all entity types in applyTranslations

---

## Phase 1: Extend Translation Pipeline to New Entity Types (1 PR)

Add actions (39 entries), expert profiles (12), riot reels (17 curated only), and action initiatives (8).

### 1a. Update `scripts/seed-translations.ts`
- Add to `TranslationFile` interface:
  ```
  actions: Record<string, { title: string; description: string }>
  expert_profiles: Record<string, { role: string; speciality: string; achievement: string }>
  riot_reels: Record<string, { title: string; caption: string }>
  action_initiatives: Record<string, { title: string; description: string }>
  ```
- Extract source data from `src/lib/seed.ts` into baseline generator
- Update `applyTranslations()` with entity_id lookups for all 4 types
- sanitizeText() already applied to all types from Phase 0c

**Design notes:**
- Expert `name` stays untranslated (proper nouns like "Dr. Sarah Chen")
- Riot reel translations only for `source='curated'` entries; community-submitted reels keep YouTube titles
- Action initiative `recipient` stays untranslated (org names)

### 1b. Update `scripts/translate.ts`
- Add to `VALID_SECTIONS`: `'actions'`, `'expert_profiles'`, `'riot_reels'`, `'action_initiatives'`

### 1c. Add runtime translation functions in `src/lib/queries/translate.ts`
- `translateActions(actions, locale)` — overlays `title`, `description`. **Must follow `translateActionInitiatives()` pattern (title/description), NOT `translateEntities()` (name/description).**
- `translateExpertProfiles(profiles, locale)` — overlays `role`, `speciality`, `achievement`
- `translateRiotReels(reels, locale)` — overlays `title`, `caption`
- Verify `translateActionInitiatives()` handles all needed fields

### 1d. Wire translation calls into pages/API
**Page-level** (server components call DB directly, not API):
- Issue detail page (`src/app/[locale]/issues/[id]/page.tsx`): translate actions, experts, reels after fetching

**API-level** (for client-side consumers):
- `GET /api/issues/[id]/actions`: accept `locale` query param, translate. When locale absent/en → no translation (backwards compatible).
- `GET /api/reels/trending`: accept `locale` query param, translate.

**Bot-level:**
- Bot route: add translate calls where `get_actions`, `get_community` (experts), `get_riot_reel` return data.

### 1e. Tests
- Unit tests for `translateActions()`, `translateExpertProfiles()`, `translateRiotReels()` — short-circuit for 'en', overlay for other locales, fallback when no translation
- Bot surface tests: `get_actions` with `language_code` returns translated titles
- Pipeline validation tests for new sections in seed-translations

### 1f. Run pipeline
- `npx tsx scripts/seed-translations.ts --generate`
- `npm run translate -- --section actions --section expert_profiles --section riot_reels --section action_initiatives`
- Validate all 56 translation files

---

## Phase 2: Country Name Translations (1 PR)

Translate 249 country names. **Evaluate `Intl.DisplayNames` first** — if it works for all 56 locales, use it as primary and skip DB rows.

### 2a. Evaluate `Intl.DisplayNames`
- Test `new Intl.DisplayNames([locale], { type: 'region' }).of(code)` for all 56 locales × sample countries
- If it works for all base locales: use it as primary source, no translation pipeline needed
- If it fails for romanised locales (bn-Latn, hi-Latn, etc.): use pipeline as fallback for those only

### 2b. Implementation (whichever approach wins)

**Option A: `Intl.DisplayNames` (preferred if evaluation passes)**
- Add `translateCountryName(code, locale)` utility using `Intl.DisplayNames`
- Fallback to English name if DisplayNames returns undefined
- For romanised locales where DisplayNames returns native script: use translation pipeline

**Option B: Translation pipeline (fallback)**
- Add `country_names` section to `TranslationFile`
- `entity_type='country'`, `entity_id=country_code`, `field='name'`
- Run `npm run translate -- --section country_names`

### 2c. Update routes and components
- `GET /api/countries`: accept `locale` query param, translate names
- **Cache fix**: Add locale to cache key. Either use URL param (`?locale=es`) so Vercel CDN caches per-locale, or add `Vary` header. Current `s-maxage=86400` would cause cross-locale pollution without this.
- Country-list component: translate `country_name` using `country_code` lookup
- Onboard country dropdown: pass locale when fetching

### 2d. Tests
- `translateCountryName()` / `translateCountryNames()` unit tests
- API route test: verify locale param returns translated names
- Cache test: verify different locales get different responses

---

## Phase 3: Add 40 New Locales — DEFERRED

Pending liability review. See original plan for details.

---

## Phase 4: Validation & Testing Hardening (1 PR)

(Sanitization already moved to Phase 0c. Concurrency/retry/romanised cleanup deferred to Phase 3.)

### 4a. Translation validation in `translate.ts`
- Deep structure validation: verify translated JSON has same keys/nesting as English baseline
- Placeholder preservation: any `{variable}` in English source must appear in translated output
- Brand name preservation: "Quiet Riot", "Quiet Riots", "Quiet Rioters" must not be translated
- Max-length validation: translated values must respect DB CHECK constraints (name ≤ 255, description ≤ 2000, term ≤ 255, etc.)

### 4b. Tests
- Placeholder: `{count}` survives translation round-trip
- Brand: "Quiet Riots" preserved in all translations
- Length: DB constraints respected (test with known long translations)
- Structure: translated JSON matches English key structure
- Integration: end-to-end test translating a section and validating output

---

## Deployment (after each PR merge)

No schema migration needed — `translations` table is generic.

- **Phase 0 PR**: Bug fixes + sanitization → merge → post-merge checklist → verify nav/lang on production
- **Phase 1 PR**: Pipeline extension → merge → run `seed-translations.ts --apply` on staging+production → verify translated actions/experts/reels
- **Phase 2 PR**: Country names → merge → verify country dropdown shows translated names
- **Phase 4 PR**: Validation hardening → merge → verify pipeline validates correctly

**Rollback:** App falls back to English for missing translations. No destructive changes.

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Layout restructure vs dynamic lang? | Dynamic via headers | Next.js requires `<html>` in root layout; restructure would break |
| Country names: DB rows or Intl.DisplayNames? | Evaluate Intl.DisplayNames first | Zero DB rows, zero API cost, built into Node.js |
| Bot API error messages: translate? | No — keep English | Bot agent reformulates for users |
| User-generated content: translate? | No | Authored by users, not seed data |
| Expert profile names: translate? | No | Proper nouns |
| Riot reel community titles: translate? | No | From YouTube oEmbed, user content |
| Sanitization: allowlist or blocklist? | Allowlist (plain text only) | Blocklist is fragile, easily bypassed |
| When to sanitize? | Phase 0 (before any new translations) | Don't generate on unsanitized data |

## Critical Files

- `src/i18n/locales.ts` — single source of truth for all locale data
- `scripts/seed-translations.ts` — translation file generation + DB insertion
- `scripts/translate.ts` — API translation pipeline
- `src/lib/queries/translate.ts` — runtime translation overlay functions
- `src/components/layout/nav-bar.tsx` — hardcoded English to fix
- `src/app/layout.tsx` — hardcoded lang attribute to fix
- `src/lib/sanitize.ts` — sanitization functions
- `messages/en.json` — UI text baseline (879 keys)
- `translations/en.json` — DB entity baseline
