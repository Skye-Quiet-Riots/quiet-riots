# Plan: Romanised Locales + Locale Architecture Refactor + Security Hardening

## Context

A Bengali user writing in Banglish (Latin-script Bengali) on WhatsApp got mixed English/Bengali script responses. Root cause: the system has `bn` (Bengali in native script) but no `bn-Latn` (Banglish).

During planning, a deep audit revealed two systemic issues that should be fixed *before* adding 11 new locales:

1. **7 independent copies of the locale list** — `routing.ts`, `ai.ts`, `seed-translations.ts`, `translate.ts`, `generate-locale-messages.ts`, `seed-reference-data.ts`, and `language-selector.tsx` all maintain their own lists/maps. Adding a locale means editing 7 files; forgetting one causes silent failures.

2. **No locale validation on most API routes** — The bot API accepts any 2-10 char string as `language_code`. Web API routes (`/api/issues?locale=`, `/api/organisations?locale=`, `/api/assistants?locale=`) accept any query param. Auth routes (`signup`, `phone/signin`, `onboarding`) store unvalidated values. Only the suggestion regenerate route validates properly.

This plan fixes the architecture first, then adds 11 romanised locales with full translations.

## New Romanised Locales (11 total)

**Tier 1 (6):** `hi-Latn` (Hinglish), `ar-Latn` (Arabizi), `bn-Latn` (Banglish), `fa-Latn` (Finglish), `ru-Latn` (Translit), `el-Latn` (Greeklish)

**Tier 2 (5):** `ta-Latn` (Tanglish), `te-Latn` (Tenglish), `ml-Latn` (Manglish), `uk-Latn` (Translit), `bg-Latn` (Shlyokavitsa)

**Skip:** `zh-Latn`, `ja-Latn`, `ko-Latn`, `th-Latn`, `he-Latn` (input methods, not reading formats; or usage declined).

All romanised locales are LTR.

---

## Phases

### Phase 1: Single Source of Truth for Locales (refactor)

**Problem:** 7 files independently define locale lists/maps. Adding 11 locales means editing all 7. This is error-prone and has already drifted (`seed-reference-data.ts` has `'sr'` that no other file has).

**Solution:** Create `src/i18n/locales.ts` as the canonical source. All other files import from it.

**New file: `src/i18n/locales.ts`**

Key TypeScript constraint: `Array.filter()` on `as const` returns `string[]`, losing the tuple type. This breaks `z.enum()` which needs a readonly tuple. Solution: define `ALL_LOCALES` and `NON_EN_LOCALES` as separate `as const` arrays, with a sync test to catch drift.

```typescript
/** Single source of truth for all supported locales. */
export const ALL_LOCALES = [
  'en', 'es', 'fr', 'de', 'pt', 'pt-BR', 'it', 'nl', 'sv', 'da', 'no', 'fi',
  'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'uk', 'ru', 'tr',
  'ar', 'he', 'fa', 'hi', 'bn', 'ta', 'te', 'ml', 'th', 'vi', 'id', 'ms',
  'zh-CN', 'zh-TW', 'ja', 'ko', 'tl', 'sw', 'el', 'ca', 'eu', 'gl',
  // Romanised variants (Latin-script)
  'hi-Latn', 'ar-Latn', 'bn-Latn', 'fa-Latn', 'ru-Latn', 'el-Latn',
  'ta-Latn', 'te-Latn', 'ml-Latn', 'uk-Latn', 'bg-Latn',
] as const;

/** Non-English locales for translation pipelines.
 *  Explicit `as const` array (not derived via .filter()) to preserve tuple type for z.enum(). */
export const NON_EN_LOCALES = [
  'es', 'fr', 'de', 'pt', 'pt-BR', 'it', 'nl', 'sv', 'da', 'no', 'fi',
  'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'uk', 'ru', 'tr',
  'ar', 'he', 'fa', 'hi', 'bn', 'ta', 'te', 'ml', 'th', 'vi', 'id', 'ms',
  'zh-CN', 'zh-TW', 'ja', 'ko', 'tl', 'sw', 'el', 'ca', 'eu', 'gl',
  'hi-Latn', 'ar-Latn', 'bn-Latn', 'fa-Latn', 'ru-Latn', 'el-Latn',
  'ta-Latn', 'te-Latn', 'ml-Latn', 'uk-Latn', 'bg-Latn',
] as const;

export type Locale = (typeof ALL_LOCALES)[number];
export type NonEnLocale = (typeof NON_EN_LOCALES)[number];

/** RTL locales — only native-script Arabic, Hebrew, Farsi. Romanised variants are LTR. */
export const RTL_LOCALES = new Set<Locale>(['ar', 'he', 'fa']);

/** Check if a string is a valid locale code. O(1) Set lookup. */
const LOCALE_SET = new Set<string>(ALL_LOCALES);
export function isValidLocale(code: string): code is Locale {
  return LOCALE_SET.has(code);
}

/** Pre-built Zod schema for non-English locale validation (centralizes the as unknown cast). */
// Usage: z.object({ locales: z.array(nonEnLocaleSchema).min(1) })
import { z } from 'zod';
export const nonEnLocaleSchema = z.enum(NON_EN_LOCALES as unknown as [string, ...string[]]);

/** Locale display names for translation prompts. */
export const LOCALE_NAMES: Record<string, string> = {
  ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan', cs: 'Czech',
  da: 'Danish', de: 'German', el: 'Greek', es: 'Spanish', eu: 'Basque',
  fa: 'Persian/Farsi', fi: 'Finnish', fr: 'French', gl: 'Galician',
  he: 'Hebrew', hi: 'Hindi', hr: 'Croatian', hu: 'Hungarian',
  id: 'Indonesian', it: 'Italian', ja: 'Japanese', ko: 'Korean',
  ml: 'Malayalam', ms: 'Malay', nl: 'Dutch', no: 'Norwegian',
  pl: 'Polish', pt: 'Portuguese (Portugal)', 'pt-BR': 'Portuguese (Brazil)',
  ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian',
  sv: 'Swedish', sw: 'Swahili', ta: 'Tamil', te: 'Telugu', th: 'Thai',
  tl: 'Filipino/Tagalog', tr: 'Turkish', uk: 'Ukrainian', vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
  'hi-Latn': 'Hinglish (Latin-script Hindi)',
  'ar-Latn': 'Arabizi (Latin-script Arabic)',
  'bn-Latn': 'Banglish (Latin-script Bengali)',
  'fa-Latn': 'Finglish (Latin-script Persian)',
  'ru-Latn': 'Translit (Latin-script Russian)',
  'el-Latn': 'Greeklish (Latin-script Greek)',
  'ta-Latn': 'Tanglish (Latin-script Tamil)',
  'te-Latn': 'Tenglish (Latin-script Telugu)',
  'ml-Latn': 'Manglish (Latin-script Malayalam)',
  'uk-Latn': 'Translit (Latin-script Ukrainian)',
  'bg-Latn': 'Shlyokavitsa (Latin-script Bulgarian)',
};

/** Native language names for UI display (language selector dropdown). */
export const NATIVE_LOCALE_NAMES: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  pt: 'Português', 'pt-BR': 'Português (Brasil)', it: 'Italiano',
  nl: 'Nederlands', sv: 'Svenska', da: 'Dansk', no: 'Norsk', fi: 'Suomi',
  pl: 'Polski', cs: 'Čeština', sk: 'Slovenčina', hu: 'Magyar',
  ro: 'Română', bg: 'Български', hr: 'Hrvatski', sl: 'Slovenščina',
  uk: 'Українська', ru: 'Русский', tr: 'Türkçe',
  ar: 'العربية', he: 'עברית', fa: 'فارسی',
  hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം',
  th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어',
  tl: 'Filipino', sw: 'Kiswahili', el: 'Ελληνικά',
  ca: 'Català', eu: 'Euskara', gl: 'Galego',
  // Romanised variants — display in Latin script
  'hi-Latn': 'Hinglish', 'ar-Latn': 'Arabizi', 'bn-Latn': 'Banglish',
  'fa-Latn': 'Finglish', 'ru-Latn': 'Translit (RU)', 'el-Latn': 'Greeklish',
  'ta-Latn': 'Tanglish', 'te-Latn': 'Tenglish', 'ml-Latn': 'Manglish',
  'uk-Latn': 'Translit (UA)', 'bg-Latn': 'Shlyokavitsa',
};

/** Language metadata for DB seeding. [code, englishName, nativeName, direction] */
export const LANGUAGES: [string, string, string, 'ltr' | 'rtl'][] = [
  ['en', 'English', 'English', 'ltr'],
  // ... all existing 45 entries (excluding stale 'sr') ...
  // New romanised entries:
  ['hi-Latn', 'Hinglish', 'Hinglish', 'ltr'],
  ['ar-Latn', 'Arabizi', 'Arabizi', 'ltr'],
  ['bn-Latn', 'Banglish', 'Banglish', 'ltr'],
  ['fa-Latn', 'Finglish', 'Finglish', 'ltr'],
  ['ru-Latn', 'Translit Russian', 'Translit', 'ltr'],
  ['el-Latn', 'Greeklish', 'Greeklish', 'ltr'],
  ['ta-Latn', 'Tanglish', 'Tanglish', 'ltr'],
  ['te-Latn', 'Tenglish', 'Tenglish', 'ltr'],
  ['ml-Latn', 'Manglish', 'Manglish', 'ltr'],
  ['uk-Latn', 'Translit Ukrainian', 'Translit', 'ltr'],
  ['bg-Latn', 'Shlyokavitsa', 'Shlyokavitsa', 'ltr'],
];
```

**Refactor consumers (7 files to update):**

1. **`src/i18n/routing.ts`** — Import `ALL_LOCALES` and `RTL_LOCALES` from `./locales`. Remove inline array. Use `defineRouting({ locales: ALL_LOCALES })` (pass directly, do NOT spread — `[...ALL_LOCALES]` creates a mutable `string[]` which destroys the `Locale` union type). next-intl's `defineRouting()` accepts `readonly` arrays. Re-export `RTL_LOCALES as rtlLocales` to avoid breaking `layout.tsx` and `routing.test.ts` (they import `rtlLocales`). Re-export `Locale` type from `locales.ts`.

2. **`src/lib/ai.ts`** — Replace `SUPPORTED_LOCALES` with `import { NON_EN_LOCALES } from '@/i18n/locales'`. Remove inline array.

3. **`scripts/seed-translations.ts`** — Replace `ALL_LOCALES` with `import { NON_EN_LOCALES } from '../src/i18n/locales'`. Remove inline array.

4. **`scripts/translate.ts`** — Replace `ALL_LOCALES` with `import { NON_EN_LOCALES, LOCALE_NAMES } from '../src/i18n/locales'`. Remove inline arrays.

5. **`scripts/generate-locale-messages.ts`** — Replace `ALL_LOCALES` with `import { NON_EN_LOCALES } from '../src/i18n/locales'`. Remove inline array.

6. **`scripts/seed-reference-data.ts`** — Replace `LANGUAGES` with `import { LANGUAGES } from '../src/i18n/locales'`. Remove inline array. (This also removes the stale `'sr'` entry that was never in `routing.locales`.)

7. **`src/components/interactive/language-selector.tsx`** — Replace inline `languageNames` Record with `import { NATIVE_LOCALE_NAMES } from '@/i18n/locales'`. Also import `Locale` from `@/i18n/locales` (or keep importing from `routing.ts` which re-exports it). This ensures the dropdown shows all 56 locales with proper display names.

**Tests:** `src/i18n/routing.test.ts`:
- Update count assertion (45 → 56)
- Add test: all 11 romanised codes present in `ALL_LOCALES`
- Add test: no romanised codes in `RTL_LOCALES`
- Add test: no duplicates in `ALL_LOCALES`
- Add test: `isValidLocale()` accepts valid codes, rejects invalid (including empty string, long string, case sensitivity)
- Add test: `NON_EN_LOCALES` count = `ALL_LOCALES` count - 1
- Add test: `ALL_LOCALES.filter(l => l !== 'en')` deep-equals `NON_EN_LOCALES` (catches drift between the two manually maintained arrays)
- Add test: `LANGUAGES` array length matches `ALL_LOCALES` length (ensures seed-reference-data stays in sync)
- Add test: every code in `LANGUAGES[i][0]` is also in `ALL_LOCALES` (no stale entries)
- Add test: every locale in `ALL_LOCALES` has an entry in `NATIVE_LOCALE_NAMES` (ensures language selector shows all locales)
- Add test: every locale in `NON_EN_LOCALES` has an entry in `LOCALE_NAMES` (ensures translation prompts work)

**Tests:** `src/lib/ai.test.ts`:
- Update `SUPPORTED_LOCALES.length` assertion (44 → 55)

**Tests:** `src/i18n/messages.test.ts`:
- Will automatically test all 56 locales (checks files exist and keys match en.json) — no code change needed, just ensure message files are created before running tests

### Phase 2: Locale Validation Across All API Routes (security hardening)

**Problem:** 10+ API entry points accept locale/language_code without validating against the allowlist.

**Solution:** Use `isValidLocale()` from `src/i18n/locales.ts` everywhere.

**Bot API — `src/app/api/bot/route.ts`:**
- Import `isValidLocale` from `@/i18n/locales`
- In `resolveLocale()` (line 773): if `language_code` is provided but `!isValidLocale(code)`, log a warning and fall back to `'en'`. This covers 6 actions that call `resolveLocale()`: `search_issues`, `get_trending`, `get_issue`, `get_org_pivot`, `get_orgs`, `get_action_initiatives`.
- In `identify` action (line 797): strip invalid `language_code` before `createUser()` / `updateUser()` — if invalid, set to `undefined` so `createUser` defaults to `'en'` (via `data.language_code || 'en'` in users.ts line 49)
- In `set_language` action (line 1271): return `apiError('VALIDATION_ERROR', 'Unsupported language code')` if not valid
- In `update_user` action (line 1034): strip invalid `language_code` silently (don't error)
- In `get_category_assistants` (line 1155) and `get_assistant_detail` (line 1165): these bypass `resolveLocale()` and use `(p.language_code as string) || 'en'` directly. Refactor both to use `resolveLocale(p)` instead — this ensures they go through the validated path. (Also improves consistency: they'll support phone-based locale fallback too.)

**Web API routes (4 files):**
- **`src/app/api/issues/route.ts`** (line 12): Add `import { isValidLocale } from '@/i18n/locales'`. Validate: `const locale = isValidLocale(raw) ? raw : undefined;`
- **`src/app/api/organisations/route.ts`** (line 12): Same pattern
- **`src/app/api/assistants/route.ts`** (line 6): Same pattern, default to `'en'`
- **`src/app/api/assistants/[category]/route.ts`** (line 10): Same pattern, default to `'en'`

**Auth routes (3 files):**
- **`src/app/api/auth/password/signup/route.ts`** (line 19): Replace `z.string().max(10).optional()` with custom Zod refinement or `.transform()` that strips invalid codes
- **`src/app/api/auth/phone/signin/route.ts`** (line 18): Same
- **`src/app/api/users/me/onboarding/route.ts`** (line 14): Same

**Pattern for auth routes (Zod):**
```typescript
import { isValidLocale } from '@/i18n/locales';
// Replace: language_code: z.string().max(10).optional(),
// With:
language_code: z.string().max(10).optional().transform((v) => v && isValidLocale(v) ? v : undefined),
```

This silently strips invalid codes rather than erroring — graceful degradation for web signup forms.

**Tests — `src/app/api/bot/bot-api.test.ts`:**
- `identify` with invalid `language_code` (`'xyz'`) → user gets `language_code: 'en'` (stripped, createUser defaults)
- `identify` with path traversal (`'../../etc'`) → silently stripped, user gets `language_code: 'en'`
- `set_language` with unsupported code → returns `VALIDATION_ERROR`
- `set_language` with valid romanised code (`'bn-Latn'`) → accepted, user updated
- `update_user` with invalid `language_code` → stripped, existing language preserved
- `identify` with valid code (`'fr'`) → accepted, stored on user

**Tests — new `src/app/api/issues/route.test.ts` (or add to existing):**
- `GET /api/issues?locale=xyz` → returns issues (ignores invalid locale, falls back to English)
- `GET /api/issues?locale=bn-Latn` → returns issues with Banglish translations

### Phase 3: Register New Locales (11 codes)

With the single source of truth in place, this is now just one file edit: add 11 codes to `ALL_LOCALES` and `LANGUAGES` in `src/i18n/locales.ts`. All consumers automatically pick them up.

**Also update `scripts/translate.ts` `buildPrompt()`:**
Add `-Latn` suffix detection:
```typescript
function buildPrompt(section: string, englishJson: string, locale: string): string {
  const localeName = LOCALE_NAMES[locale] || locale;
  let prompt = `Translate the following JSON values from English to ${localeName}...`;

  if (locale.endsWith('-Latn')) {
    prompt += `\n\nCRITICAL — LATIN SCRIPT ONLY:
- Do NOT use any native script characters (no Bengali, Devanagari, Arabic, Cyrillic, Greek, Tamil, Telugu, Malayalam)
- Use Latin alphabet ONLY — this is a romanised variant for people who type in Latin script
- Follow real-world conventions, not academic transliteration
- For Arabizi: use numeral conventions (3=ع, 7=ح, 5=خ, 2=ء, 8=ق, 9=ص)
- For Hinglish: mix Hindi and English words naturally as speakers do
- For Finglish: use established Persian romanisation conventions`;
  }
  return prompt;
}
```

**Note on dynamic import:** `messages/bn-Latn.json` (hyphen + capital letter in filename) works with `import(\`../../messages/${locale}.json\`)` in `src/i18n/request.ts` because the locale is validated by `hasLocale()` before the import, and the filesystem supports these filenames. Precedent: `pt-BR.json` and `zh-CN.json` already use hyphens.

**Note on Accept-Language:** Browser Accept-Language headers will never send `bn-Latn` — browsers only know `bn`, `hi`, etc. This means `-Latn` locales are **explicit choice only** (via language selector or bot `set_language`), never auto-detected from browser headers. This is correct behavior — users must opt-in to romanised variants.

**Note on `generate-locale-messages.ts`:** This script has a `GOOGLE_LANG_MAP` for Google Translate API codes. `-Latn` codes are not standard Google Translate codes. Add a guard that skips `-Latn` locales when using Google Translate fallback, or map them to their base locale with a post-processing step to romanise. Since the primary pipeline uses Anthropic API via `translate.ts`, this is low priority.

### Phase 4: Create UI Translation Files (`messages/`)

Create 11 new `messages/<code>.json` files (e.g., `messages/bn-Latn.json`) with all 870 keys translated.

**Approach:** Use a single Task agent per batch of 2-3 locales to translate all keys from `en.json`. Agent returns JSON mapping locale → translations. A Node.js script writes the files.

**Key rules:**
- Latin script only — no native script characters
- Follow real-world conventions (not academic transliteration)
- Arabizi: numeral conventions (3=ع, 7=ح, 5=خ, 2=ء)
- Hinglish: mix Hindi and English words naturally
- Keep `{variable}` placeholders exactly as-is
- Keep brand names in English (Quiet Riots, Quiet Rioters)
- Keep technical terms as-is (IPO, Pre-Seed)

**Validation:**
```bash
for f in messages/*.json; do node -e "require('./$f')" 2>&1 || echo "BROKEN: $f"; done
npm test -- --grep "i18n"
npx prettier --write messages/*.json
# Spot-check: no native script in romanised files
for code in bn-Latn hi-Latn ar-Latn fa-Latn ru-Latn el-Latn ta-Latn te-Latn ml-Latn uk-Latn bg-Latn; do
  node -e "const s=JSON.stringify(require('./messages/${code}.json')); if(/[\u0900-\u09FF\u0980-\u09FF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/.test(s)) console.log('FAIL: ${code}'); else console.log('OK: ${code}');"
done
```

### Phase 5: Create DB Translation Files (`translations/`)

Create 11 new `translations/<code>.json` with translated issues (49), organisations (50), synonyms (209), categories (16), and category_assistants (16).

**Command:** `npm run translate -- --section issues --section organisations --section synonyms --section categories --section category_assistants --locales bn-Latn,hi-Latn,ar-Latn,fa-Latn,ru-Latn,el-Latn,ta-Latn,te-Latn,ml-Latn,uk-Latn,bg-Latn`

The `-Latn` prompt enhancement from Phase 3 ensures Latin-script-only output.

**Validation:**
```bash
for f in translations/*.json; do node -e "require('./$f')" 2>&1 || echo "BROKEN: $f"; done
npm test -- scripts/seed-translations.test.ts
# Spot-check: no native script
for code in bn-Latn hi-Latn ar-Latn fa-Latn ru-Latn el-Latn ta-Latn te-Latn ml-Latn uk-Latn bg-Latn; do
  node -e "const s=JSON.stringify(require('./translations/${code}.json')); if(/[\u0900-\u097F\u0980-\u09FF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/.test(s)) console.log('FAIL: ${code}'); else console.log('OK: ${code}');"
done
```

### Phase 6: Build, Test, Deploy

1. Seed `languages` table on staging + production (adds 11 new rows — **must happen before `--apply`** or FK constraint rejects new locale codes)
2. Run `seed-translations.ts --apply` on staging + production
3. `npm run build` — build time increases ~24% (56 vs 45 locale variants per SSG page). Currently 9.4s → expected ~11.5s.
4. `npm test` — all tests pass
5. Create PR, wait for CI, merge
6. Post-merge: run Translation Verification Protocol, verify API returns romanised translations

### Phase 7: Update SKILL.md for Romanised Locale Mapping

**File:** `~/.openclaw/skills/quiet-riots/SKILL.md`

Update the language section:
- Banglish detected → `set_language` with `bn-Latn` (not `bn`)
- Hinglish detected → `hi-Latn` (not `hi`)
- Arabizi detected → `ar-Latn` (not `ar`)
- Finglish → `fa-Latn`, Russian translit → `ru-Latn`, Greeklish → `el-Latn`
- Tanglish → `ta-Latn`, Tenglish → `te-Latn`, Manglish → `ml-Latn`, Ukrainian translit → `uk-Latn`, Bulgarian translit → `bg-Latn`

Add explicit rule: "When the user writes in native script (বাংলা, हिन्दी, العربية, etc.), use the base code (`bn`, `hi`, `ar`). When they write in romanised Latin script, use the `-Latn` variant (`bn-Latn`, `hi-Latn`, `ar-Latn`). This determines whether the API returns native or romanised translations."

Clear OpenClaw sessions + restart gateway.

---

## Security Measures

| Concern | Mitigation |
|---------|-----------|
| Invalid `language_code` in bot API (15+ actions) | `isValidLocale()` in `resolveLocale()` (covers 6 actions), plus explicit checks in `identify`, `set_language`, `update_user`. Refactor `get_category_assistants` + `get_assistant_detail` to use `resolveLocale()` instead of direct access. |
| Invalid `?locale=` in web API routes (4 routes) | `isValidLocale()` check, fall back to `'en'` or `undefined` |
| Invalid `language_code` in auth routes (3 routes) | Zod `.transform()` strips invalid codes silently |
| Path traversal via locale in dynamic import | Already safe: `hasLocale()` validates in `request.ts` before import |
| SQL injection via locale | Already safe: all queries use parameterised args |
| Orphan language codes in users table | `resolveLocale()` rejects invalid codes; auth routes strip them |
| Translation file integrity | JSON validation in tests + `sanitizeText()` on DB insertion |
| Romanised locale XSS risk | Same `sanitizeText()` applied to all translated values |

## Tests to Add

### Architecture Tests (`src/i18n/routing.test.ts`)
- Total locale count is 56
- All 11 romanised codes present in `ALL_LOCALES`
- No duplicates in `ALL_LOCALES`
- Romanised codes NOT in `RTL_LOCALES`
- `isValidLocale()` returns true for valid codes, false for invalid
- `NON_EN_LOCALES` count = `ALL_LOCALES` count - 1
- `LANGUAGES` array length matches `ALL_LOCALES` length (sync check)
- Every code in `LANGUAGES` is also in `ALL_LOCALES` (no stale entries)

### Security Tests (`bot-api.test.ts`)
- `identify` with invalid `language_code` (`'xyz'`) → user gets `language_code: 'en'`
- `identify` with path traversal (`'../../etc'`) → silently stripped, user gets `'en'`
- `set_language` with unsupported code → returns `VALIDATION_ERROR`
- `set_language` with valid romanised code (`'bn-Latn'`) → accepted
- `update_user` with invalid `language_code` → stripped, existing language preserved
- `identify` with valid code (`'fr'`) → accepted, stored on user
- `get_category_assistants` with invalid `language_code` → falls back to `'en'` (via refactored `resolveLocale()`)
- `search_issues` with invalid `language_code` → falls back to `'en'`

### Web API Tests
- `GET /api/issues?locale=xyz` → returns issues without translations (falls back)
- `GET /api/issues?locale=bn-Latn` → returns issues with Banglish translations
- `GET /api/assistants?locale=../../etc` → returns assistants without translations (falls back to 'en')

### Translation Completeness Tests (`seed-translations.test.ts`)
- All 56 locale files exist in `translations/`
- All 56 locale files exist in `messages/`
- Romanised translations use Latin script only (Unicode range spot-check)
- Synonym arrays match English baseline length

### Integration Tests
- Bot API `search_issues` with `language_code: 'bn-Latn'` → Latin-script Bengali issue names
- Bot API `search_issues` with `language_code: 'bn'` → native-script Bengali issue names

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `src/i18n/locales.ts` | **NEW** — Single source of truth for all locale lists, validation, metadata, native names, Zod schema |
| `src/i18n/routing.ts` | Import from `locales.ts`, remove inline array, re-export `Locale` type |
| `src/i18n/routing.test.ts` | Update assertions for 56 locales, add architecture/sync tests |
| `src/lib/ai.ts` | Import `NON_EN_LOCALES` from `locales.ts`, remove inline array |
| `src/lib/ai.test.ts` | Update `SUPPORTED_LOCALES.length` assertion (44 → 55) |
| `src/components/interactive/language-selector.tsx` | Import `NATIVE_LOCALE_NAMES` from `locales.ts`, remove inline `languageNames` Record |
| `src/app/api/bot/route.ts` | Import `isValidLocale`, add validation to 4 actions + refactor 2 category assistant actions to use `resolveLocale()` |
| `src/app/api/bot/bot-api.test.ts` | Add security tests for locale validation |
| `src/app/api/issues/route.ts` | Add `isValidLocale` check on `?locale=` param |
| `src/app/api/organisations/route.ts` | Add `isValidLocale` check on `?locale=` param |
| `src/app/api/assistants/route.ts` | Add `isValidLocale` check on `?locale=` param |
| `src/app/api/assistants/[category]/route.ts` | Add `isValidLocale` check on `?locale=` param |
| `src/app/api/auth/password/signup/route.ts` | Zod `.transform()` strips invalid locale |
| `src/app/api/auth/phone/signin/route.ts` | Zod `.transform()` strips invalid locale |
| `src/app/api/users/me/onboarding/route.ts` | Zod `.transform()` strips invalid locale |
| `src/app/api/suggestions/[id]/translations/regenerate/route.ts` | Replace inline `z.enum(SUPPORTED_LOCALES as unknown as ...)` with `nonEnLocaleSchema` import from `@/i18n/locales` |
| `src/app/api/suggestions/[id]/translations/route.ts` | Replace `SUPPORTED_LOCALES` import from `@/lib/ai` with `NON_EN_LOCALES` from `@/i18n/locales` |
| `src/lib/queries/generate-translations.test.ts` | Update mock if `SUPPORTED_LOCALES` export name changes in `ai.ts` |
| `scripts/seed-translations.ts` | Import from `locales.ts`, remove inline array |
| `scripts/translate.ts` | Import from `locales.ts`, remove inline arrays, add `-Latn` prompt logic |
| `scripts/generate-locale-messages.ts` | Import from `locales.ts`, remove inline array, add `-Latn` guard for `GOOGLE_LANG_MAP` (these codes are not standard Google Translate codes) |
| `scripts/seed-reference-data.ts` | Import `LANGUAGES` from `locales.ts`, remove inline array |
| `messages/bn-Latn.json` (x11) | New UI translation files |
| `translations/bn-Latn.json` (x11) | New DB entity translation files |
| `~/.openclaw/skills/quiet-riots/SKILL.md` | Map romanised detection → `-Latn` locale codes |

## Commit Strategy

**Critical constraint:** Message files MUST exist before locale codes are deployed. If `ALL_LOCALES` includes `bn-Latn` but `messages/bn-Latn.json` doesn't exist, `messages.test.ts` fails. Phases 3-4 must be in the same PR.

1. Phase 1 + 2 (refactor + security hardening — no new locales yet) → commit + push
2. Phase 3 + 4 (register 11 locales + create UI translation files — atomic) → commit + push
3. Phase 5 (DB translation files) → commit + push
4. Phase 6 (build + test + deploy) → create PR, CI, merge
5. Phase 7 (SKILL.md) → after merge, clear sessions, restart gateway

**Deployment ordering after merge:**
1. `seed-reference-data.ts` on staging + production (inserts 11 new `languages` rows — **must happen first** or FK constraint rejects translations)
2. `seed-translations.ts --apply` on staging + production (inserts DB translations — requires step 1)
3. Verify Vercel auto-deploy completed (code references new locales)
4. Health check + spot-check romanised locale pages

## Architecture Decision: Why NOT to refactor further

The audit considered but rejected these additional refactors:
- **FK constraint on `users.language_code`**: Would require a migration + backfill of any invalid values. Low risk since we're adding validation at every entry point. Can do later.
- **Code-splitting locale message files**: At 56 locales (~46KB each = 2.6MB total), it's still fast. Only needed at 100+ locales.
- **ISR instead of SSG**: Build goes from 9.4s → ~11.5s. Only needed at 100+ locales.
- **Translation table partitioning**: ~37,500 rows with 56 locales. Indexes are good. Only needed at 100K+ rows.

The single-source-of-truth refactor + validation hardening is the right amount of refactoring — it makes adding future locales a one-file change while hardening every entry point.

## Database Design Review: Multi-Surface Readiness

### Current State (2 surfaces: web + WhatsApp)

The database schema is **well-suited for the current 2-surface architecture** but has 5 gaps that will need addressing before adding Discord, Telegram, or other surfaces. None of these gaps should be fixed in THIS plan — they are separate epics with their own migration complexity.

**What works well today:**
- **Bot API is surface-agnostic**: `/api/bot` endpoint doesn't know or care which messaging platform calls it. Adding Telegram/Discord is just a new client calling the same API.
- **OAuth accounts table**: Already supports multiple providers per user (`accounts` table with `UNIQUE(provider, provider_account_id)`).
- **Phone E.164 normalisation**: Consistent across all routes via `normalizePhone()`.
- **Translations table**: `(entity_type, entity_id, field, language_code, value)` design scales to any number of locales. Proper indexes: `idx_translations_lookup(entity_type, entity_id, language_code)` and `idx_translations_lang(language_code, entity_type)`.

**What needs changing for 3+ surfaces (future epics, NOT this plan):**

| Gap | Current State | Multi-Surface Need | Complexity |
|-----|---------------|-------------------|------------|
| No `platform_identities` table | `users.phone` = WhatsApp identity (UNIQUE) | Need `platform_identities(user_id, platform, platform_user_id)` to link one user to multiple platforms (WhatsApp + Telegram + Discord) | Medium — new table, migrate existing phone→identity rows, update bot route to resolve user by platform+id |
| `language_code` is global per user | `users.language_code TEXT DEFAULT 'en'`, no FK to `languages` | Consider per-surface language preference (user speaks English on web, Hinglish on WhatsApp). Alternatively: keep global (simpler, and most users want one language everywhere) | Low — may not need changing; global preference is defensible |
| `user_memory` is surface-agnostic | `UNIQUE(user_id, memory_key)`, no surface/platform column | Per-surface memory isolation (WhatsApp bot context vs Discord bot context). Or: keep shared (cross-surface memory is a feature, not a bug — user mentions something on WhatsApp, bot remembers on Discord) | Decision-dependent — could go either way |
| `messages` table is WhatsApp-specific | Has `whatsapp_message`, `whatsapp_delivered_at`, `whatsapp_expires_at`, `whatsapp_attempts` columns | Replace with generic `delivery_channel TEXT CHECK(channel IN ('whatsapp','telegram','discord','sms','email'))` + `delivery_payload TEXT` (JSON) + `delivered_at` + `delivery_attempts` | Medium — migration, update polling scripts, update delivery logic |
| Phone as sole non-OAuth identity | `users.phone UNIQUE` | Telegram/Discord users may not share phone numbers. Need platform-specific usernames/IDs as identity keys | Medium — tied to `platform_identities` table above |

### Why these are separate from this plan

1. **No migrations needed for romanised locales**: All 11 new locale codes fit within existing `language_code TEXT` column (max 10 chars; longest is `bg-Latn` at 7). The `languages` table already accepts them via `seed-reference-data.ts INSERT`.
2. **No schema changes needed for locale validation**: `isValidLocale()` is pure application-layer validation — no DB constraints added/changed.
3. **Multi-surface DB changes are breaking**: Renaming `whatsapp_*` columns or adding `platform_identities` requires coordinated migration across staging + production + all delivery scripts + bot API.
4. **Scope discipline**: This plan adds 11 locales and hardens security. Multi-surface DB redesign is a separate architectural decision that should be its own plan + PR.

### Recommended sequence for multi-surface expansion

1. **This plan** — romanised locales + locale architecture refactor + security hardening (no DB schema changes)
2. **Future Epic A** — `platform_identities` table + user resolution refactor (prerequisite for any new surface)
3. **Future Epic B** — generic message delivery (replace `whatsapp_*` columns with `delivery_channel` + `delivery_payload`)
4. **Future Epic C** — per-surface language preferences (if needed after user feedback)
5. **Add Telegram/Discord** — new bot clients calling existing `/api/bot` endpoint, using `platform_identities` for user lookup

## After This Plan: Adding a New Locale

After implementing this plan, adding a new locale (e.g., `sw-Latn` for Swahili in Latin script) requires:

| Step | File(s) | What to do |
|------|---------|------------|
| 1. Register | `src/i18n/locales.ts` | Add to `ALL_LOCALES`, `NON_EN_LOCALES`, `LOCALE_NAMES`, `NATIVE_LOCALE_NAMES`, `LANGUAGES` — **this is the only code file to edit** |
| 2. UI translations | `messages/<code>.json` | Generate via Task agent + Node.js script (see UI Translation Protocol in CLAUDE.md) |
| 3. DB translations | `translations/<code>.json` | Generate via `npm run translate -- --section <all> --locales <code>` |
| 4. DB seed | Run `seed-reference-data.ts` | Adds `languages` row (required before translations apply) |
| 5. DB apply | Run `seed-translations.ts --apply` | Inserts translations into DB |
| 6. Bot awareness | `~/.openclaw/skills/quiet-riots/SKILL.md` | Add locale to SKILL.md so bot knows about it |

**What automatically propagates** (zero code changes needed):
- Routing/middleware (next-intl reads from `ALL_LOCALES`)
- Language selector dropdown (reads from `NATIVE_LOCALE_NAMES`)
- Bot API `resolveLocale()` (uses `isValidLocale()` from `locales.ts`)
- Bot API `set_language` validation
- Web API `?locale=` validation (4 routes)
- Auth route locale validation (3 routes)
- Translation pipeline (`translate.ts` reads `NON_EN_LOCALES`)
- SSG page generation (`generateStaticParams` reads `routing.locales`)
- RTL detection (only if added to `RTL_LOCALES` set)

**What does NOT auto-propagate** (manual steps 2-6 above):
- Translation file content (must be generated/translated)
- DB `languages` row (must be seeded)
- DB translation rows (must be applied)
- Bot SKILL.md awareness (must be updated)

This is a significant improvement over the current state where adding a locale requires editing 7 files, any of which can be forgotten causing silent failures.

## Key Decisions

1. **Serbian (`'sr'`):** `seed-reference-data.ts` has `'sr'` but no other file does. No `messages/sr.json` or `translations/sr.json` exists. **Decision:** Drop it from `LANGUAGES` when consolidating. It's unsupported dead data. Any existing DB rows stay (harmless).

2. **`Locale` type location:** Export `Locale` from `locales.ts` as the canonical definition (`type Locale = (typeof ALL_LOCALES)[number]`). In `routing.ts`, re-export it for backward compatibility (`export type { Locale } from './locales'`). Since `defineRouting({ locales: ALL_LOCALES })` passes the `as const` array directly (no spreading), `(typeof routing.locales)[number]` will be the same union type. Downstream imports from `routing.ts` continue to work unchanged. **Critical: do NOT spread ALL_LOCALES** — `[...ALL_LOCALES]` creates a mutable `string[]` which destroys the `Locale` union type into just `string`.

3. **Script imports:** Scripts use relative paths (`'../src/i18n/locales'`), not `@/` aliases. Confirmed working — `seed-translations.test.ts` already imports `from '../src/i18n/routing'`.

4. **`NON_EN_LOCALES` type:** Using `.filter()` on `as const` array returns `string[]`, losing the union type. Fixed by defining `NON_EN_LOCALES` as an explicit `as const` array. The suggestion regenerate route (`src/app/api/suggestions/[id]/translations/regenerate/route.ts` line 13) already uses `z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]])` — confirmed this cast pattern works with `as const` arrays. Importing `NON_EN_LOCALES` and using the same cast will compile cleanly.

5. **`get_category_assistants` + `get_assistant_detail` refactor:** These currently bypass `resolveLocale()` and use `p.language_code` directly. Refactoring them to use `resolveLocale()` means they'll also support phone-based locale fallback (an improvement). No behavior change for current callers — OpenClaw always passes `language_code` explicitly.

6. **Graceful degradation strategy:**
   - Bot `set_language`: **error** on invalid code (user explicitly chose it — tell them it's wrong)
   - Bot `identify`, `update_user`, `get_*` actions: **silent fallback** to `'en'` (don't break the flow)
   - Web API `?locale=`: **silent fallback** (don't error on bookmarked URLs)
   - Auth routes: **silent strip** (don't block signup/signin over a locale preference)
