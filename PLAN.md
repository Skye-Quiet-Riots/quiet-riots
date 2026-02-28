# i18n Translation Pipeline Hardening

## Context

Two bugs caused non-English users to see English text on issue pages:

1. **Silent skip bug** — `seed-translations --apply` silently skipped `issue_per_riot` translations because non-English translation files had translated issue names as JSON keys (e.g., `"Cancelaciones de Trenes"` instead of `"Train Cancellations"`). The lookup returned `undefined` → translation silently dropped.

2. **Inconsistent key bug** — The AI translator produced different translations of the same issue name across sections (`"Retrasos en Vuelos"` in `issue_per_riot` vs `"Retrasos de Vuelos"` in `issues`), defeating even the reverse lookup.

Both were patched (PR #152: reverse lookup, PR #153: normalization script), but the architecture still lacks guardrails. This refactoring adds prevention at every stage of the pipeline.

## Scope

**In scope:** Translation file validation, apply-time error reporting, pipeline key normalization, post-apply coverage verification.

**Out of scope:** Runtime translate functions (working correctly), DB schema, UI message system (already well-tested by `src/i18n/messages.test.ts`), page-level helpers (not worth the abstraction — current page patterns are clear and type-safe).

---

## Phase 1: CI Key Parity Tests for `translations/*.json`

**Goal:** Catch translated-key bugs at CI time, before they reach `--apply`.

**File:** `scripts/seed-translations.test.ts`

**What exists today:** Tests cover categories (16 keys), issues (49 keys + name/description fields), organisations (50 keys + fields), synonyms (key parity + array length + content quality), category_assistants (16 keys + 7 fields + content quality), and a regression test checking translations aren't English placeholders.

**What's missing:** Zero tests for `actions`, `expert_profiles`, `riot_reels`, `action_initiatives`, or `issue_per_riot` key correctness.

**Changes:**

1. Add a comprehensive key parity test for `issue_per_riot`:
   - Compare keys against `en.json`'s `issue_per_riot` keys (the source of truth, built from `perRiotCopy.map(p => p.name_match)`)
   - **Important:** 2 of the 49 keys are LIKE patterns (`%Bus%Cuts`, `%Sewage in Rivers%`) — these are valid and must be tested as literal key strings, not as regex patterns
   - Each entry must have all 4 fields (`agent_helps`, `human_helps`, `agent_focus`, `human_focus`) non-empty

2. Add key parity + non-empty field tests for the other 4 missing sections:
   - `actions`: keys match `ACTIONS.map(a => a.title)`, each has `title` + `description`
   - `expert_profiles`: keys match `EXPERT_PROFILES.map(e => e.name)`, each has `role` + `speciality` + `achievement`
   - `riot_reels`: keys match `RIOT_REELS.map(r => r.video_id)`, each has `title` + `caption`
   - `action_initiatives`: keys match `ACTION_INITIATIVES.map(ai => ai.title)`, each has `title` + `description`

3. Add a catch-all generic section test that validates ALL keyed sections have matching keys to en.json. This ensures any future section added to `TranslationFile` is automatically covered:

```typescript
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const KEYED_SECTIONS = Object.keys(enData).filter(k => k !== 'locale' && k !== 'synonyms');

it.each(nonEnLocales)('%s.json has matching keys in all sections', (locale) => {
  for (const section of KEYED_SECTIONS) {
    const enKeys = Object.keys(enData[section]).sort();
    const localeKeys = Object.keys(data[section]).sort();
    expect(localeKeys, `${locale}/${section}`).toEqual(enKeys);
  }
});
```

**Why first:** Highest impact, smallest change. Would have caught both original bugs. Runs on every PR via `npm test`.

**Complexity:** Small (~120 lines added to existing test file)

---

## Phase 2: Strict Mode for `--apply` with Skip Tracking

**Goal:** Make `--apply` fail loudly when translations can't be matched, instead of silently skipping.

**File:** `scripts/seed-translations.ts`

**Current behavior:** A bare `skipped++` counter at ~9 locations in `applyTranslations()`. At the end, prints only total counts: `"Applied X translations across Y locales (Z skipped)"`. No detail on WHAT was skipped or WHY.

**Changes:**

1. Replace `skipped++` with a structured skip tracker:

```typescript
interface SkipEntry {
  locale: string;
  section: string;
  key: string;
  reason: string;
}
const skipLog: SkipEntry[] = [];
```

2. At the end of `applyTranslations()`, print a per-section summary table:

```
Section                Expected   Applied   Skipped
categories                 880       880         0
issues                    5390      5390         0
issue_per_riot            5390      5335        55  ← WARNING
───────────────────────────────────────────────────
Total                    47109     47054        55
```

3. If any skips occurred, print the top 10 most-skipped keys with their reasons.

4. Add `--strict` CLI flag. When passed:
   - Exit with code 1 if any entries were skipped
   - Useful for CI or verification runs
   - **Default: off** (not strict) — this preserves backward compatibility, since legitimate skips happen when production has entities not yet in the translation pipeline

5. Add `--verbose` flag — print each skip as it happens (useful for debugging).

**Design decision: `--strict` defaults to OFF.** The review identified that production can have entities (e.g., user-suggested issues) not yet in `perRiotCopy`, so skipping is sometimes legitimate. The skip report + summary table gives visibility without breaking the workflow. Users opt into `--strict` when they want zero-tolerance.

**Complexity:** Medium (~130 lines of changes)

---

## Phase 3: Integrated Key Normalization in `translate.ts`

**Goal:** Prevent wrong keys from being written to translation files in the first place, eliminating the need for the standalone `normalize-per-riot-keys.js` script.

**Files:** `scripts/translate-validation.ts`, `scripts/translate-validation.test.ts`, `scripts/translate.ts`

**Changes:**

1. Add `normalizeTranslatedKeys()` to `translate-validation.ts`:

```typescript
export function normalizeTranslatedKeys(
  section: string,
  englishBaseline: Record<string, unknown>,
  translated: Record<string, unknown>,
  fullLocaleData: TranslationFile,
): { normalized: Record<string, unknown>; fixes: string[] }
```

Logic:
- Build set of English baseline keys
- For each key in `translated`:
  - If it exists in English baseline → keep as-is
  - If section is `issue_per_riot` and the key matches a translated issue name from `fullLocaleData.issues[enName].name` → remap to the English key
  - Otherwise → keep it and add a warning to `fixes`
- For each English baseline key missing from output → add it with the English value as fallback, add a warning to `fixes`

2. Integrate into `translate.ts` — after the AI returns a translation for a section and after `validateTranslation()`, call `normalizeTranslatedKeys()` and use the normalized result:

```typescript
const { normalized, fixes } = normalizeTranslatedKeys(section, enSection, translated, localeData);
if (fixes.length > 0) {
  console.log(`  🔧 ${locale}/${section}: ${fixes.length} key fix(es)`);
  for (const fix of fixes) console.log(`     ${fix}`);
}
localeData[section] = normalized;
```

3. Add tests in `translate-validation.test.ts`:
   - Key matching an English baseline key → kept as-is
   - `issue_per_riot` key matching a translated issue name → remapped to English
   - Unknown key → kept with warning
   - Missing English key → filled with baseline value + warning
   - LIKE pattern keys (`%Bus%Cuts`) → kept as-is (they're literal strings, not patterns in the key context)
   - Non-`issue_per_riot` section with wrong key → warning but no auto-fix (keys like expert names, video IDs, action titles should never change)

4. Add deprecation comment to `scripts/normalize-per-riot-keys.js`:
   ```
   // DEPRECATED: Key normalization is now built into scripts/translate.ts.
   // This script is kept for manual one-off fixes but is no longer part of the pipeline.
   ```

**Why this matters:** Phase 1 catches bad keys in CI, but only AFTER they're committed. Phase 3 prevents them from being written in the first place, so the commit never has bad keys.

**Complexity:** Medium (~80 lines new code in translate-validation.ts, ~60 lines tests)

---

## Phase 4: Post-Apply DB Coverage Verification

**Goal:** After `--apply`, verify the DB has adequate translation coverage and surface any gaps.

**File:** `scripts/seed-translations.ts`

**Changes:**

1. Add `verifyTranslationCoverage()` function:
   - Query: `SELECT entity_type, language_code, COUNT(*) FROM translations GROUP BY entity_type, language_code`
   - Compare against expected counts derived from source data arrays
   - Print a per-entity-type summary table with locale count and min/max translation counts
   - Flag entity_type+locale combos with fewer translations than expected

2. Automatically run at the end of `applyTranslations()` (informational — always prints the coverage report).

3. Add `--verify` CLI flag for standalone verification without applying:
   ```bash
   npx tsx scripts/seed-translations.ts --verify
   ```

4. In `--strict` mode only, exit with code 1 if coverage gaps are found.

**Design decision: verification is informational by default.** The coverage report always prints after `--apply` so operators see the state. Only `--strict` makes gaps fatal. This avoids false alarms when production has entities not yet in the translation pipeline.

**Complexity:** Small (~80 lines)

---

## Implementation Order

```
Phase 1 (CI tests)     → commit + push
Phase 2 (strict apply) → commit + push
Phase 3 (normalize)    → commit + push
Phase 4 (verify)       → commit + push
Create PR → CI → merge → post-merge checklist
```

Phases 1 and 2 are independent (can be done in either order). Phase 3 builds on understanding from Phase 1. Phase 4 follows Phase 2 naturally (both touch `seed-translations.ts`).

## Files Modified

| File | Phases | What Changes |
|------|--------|-------------|
| `scripts/seed-translations.test.ts` | 1 | Key parity tests for all 9 keyed sections + catch-all test (~120 lines) |
| `scripts/seed-translations.ts` | 2, 4 | Skip tracking, summary table, `--strict`/`--verbose`/`--verify` flags (~210 lines) |
| `scripts/translate-validation.ts` | 3 | Add `normalizeTranslatedKeys()` function (~80 lines) |
| `scripts/translate-validation.test.ts` | 3 | Normalization tests (~60 lines) |
| `scripts/translate.ts` | 3 | Integrate normalization after AI translation (~15 lines) |
| `scripts/normalize-per-riot-keys.js` | 3 | Add deprecation comment (~3 lines) |

## Edge Cases Addressed

| Edge Case | How Handled |
|-----------|-------------|
| LIKE pattern keys (`%Bus%Cuts`, `%Sewage in Rivers%`) | Treated as literal string keys in tests and normalization — they're only special in SQL |
| Production issues not in `perRiotCopy` | `--apply` skips gracefully by default; `--strict` flag opts into hard failure |
| AI translating keys inconsistently across sections | Normalization in Phase 3 remaps via reverse lookup from `issues` section |
| Missing English keys in AI output | Normalization fills with English baseline values as fallback |
| New sections added to `TranslationFile` in future | Catch-all test from Phase 1 auto-covers any section with object keys |

## Verification

1. `npm test` — all existing 2169 tests pass + new Phase 1/3 tests pass
2. `npm run build` — clean build
3. Run `--apply` against staging — verify summary table shows 0 skips
4. Run `--apply --strict` against staging — verify exit code 0
5. Run `--verify` against staging — verify full coverage report
6. Run `npm run translate -- --section issue_per_riot --locales es --dry-run` — verify normalization fires (Phase 3)
