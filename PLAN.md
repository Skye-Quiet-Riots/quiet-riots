# Plan: Auto-translate issues on approval

## Context

New Quiet Riots created via the bot/web start as `pending_review`. A Setup Guide approves them, but translations must be triggered manually via a separate endpoint. If nobody does, non-English users see raw English text. Two production issues ("Mobile Data Charges", "Fly Tipping") currently show English on the Spanish page.

**Fix:** Auto-trigger translation generation when a suggestion is approved, using `after()` for non-blocking guaranteed execution.

## Existing infrastructure

All runtime translation code already exists and is production-tested:
- `generateAndStoreTranslations()` — `src/lib/queries/generate-translations.ts`
- `markTranslationsReady()` — `src/lib/queries/suggestions.ts`
- `generateEntityTranslations()` — `src/lib/ai.ts` (calls Haiku, ~3-5s for 55 locales)
- `ANTHROPIC_API_KEY` — already used at runtime by `translateToEnglish()` in bot flows
- `after()` — exported from `next/server` (verified in Next.js 16.1.6)

## Phase 1: Extract translation trigger function + wire into approval

### Step 1a: Create `triggerAutoTranslation()` helper

**File:** `src/lib/queries/generate-translations.ts`

Add a focused function that encapsulates the approve→translate→mark-ready flow:

```typescript
export async function triggerAutoTranslation(
  suggestionId: string,
  entityType: 'issue' | 'organisation',
  entityId: string,
  fields: Record<string, string>,
): Promise<{ success: boolean; localeCount: number }> {
  const result = await generateAndStoreTranslations(entityType, entityId, fields);
  if (result.success) {
    await markTranslationsReady(suggestionId);
  }
  return result;
}
```

**Why extract:** Testable in isolation without mocking `after()`. Keeps the bot route handler thin. Same function could be reused if a web approval path is added later.

### Step 1b: Call from approve handler via `after()`

**File:** `src/app/api/bot/route.ts` — `review_suggestion` → `approve` case (~line 1490)

```typescript
import { after } from 'next/server';

case 'approve': {
  const result = await approveSuggestion(...);

  // Auto-generate translations after response (guaranteed by Vercel)
  const entityType = suggestion.suggested_type === 'issue' ? 'issue' : 'organisation';
  const entityId = suggestion.issue_id || suggestion.organisation_id;
  if (entityId) {
    const fields: Record<string, string> = { name: suggestion.suggested_name };
    if (suggestion.description) fields.description = suggestion.description;
    after(() =>
      triggerAutoTranslation(suggestionId, entityType, entityId, fields).catch(() => {})
    );
  }

  // Existing notification + return (unchanged)
  notifyUser(...).catch(() => {});
  return ok({ suggestion: result, decision: 'approved' });
}
```

**Design decisions:**
- **`after()` not `await`:** Approval returns instantly. `after()` is guaranteed by Vercel (unlike bare fire-and-forget). Guide doesn't wait 5s.
- **`after()` not fire-and-forget:** Vercel can kill the function after response. `after()` extends the function lifetime. This is the Next.js-blessed pattern.
- **`.catch(() => {})` inside `after`:** Prevents unhandled rejection if the Anthropic API fails. Suggestion stays `approved`; guide can retry via existing manual endpoint.
- **No response shape change:** Bot API contract unchanged.
- **Safety net:** `goLiveSuggestion()` requires `translations_ready` status — issue can't go live without translations, even if auto-generation fails silently.

### Step 1c: Update approval notification

**File:** `src/app/api/bot/route.ts` — approve notification (~line 1503)

Change "under review for translations" to "Translations are being generated automatically."

## Phase 2: Fix existing untranslated issues

Add "Mobile Data Charges" and "Fly Tipping" to ISSUES array in `scripts/seed-translations.ts`, then run the proven CLI pipeline:

```bash
npx tsx scripts/seed-translations.ts --generate
npm run translate -- --section issues
# Apply to staging + production via --apply
```

**File:** `scripts/seed-translations.ts` — add 2 issues to ISSUES array

## Phase 3: Tests

### Critical: `after()` throws outside request scope

`after()` throws **synchronously** when called outside a Next.js request context (verified by running it in Node). In Vitest, `POST(request)` is called directly — no Next.js server manages the request lifecycle. Without a mock, `after()` will throw in every approve test, breaking them.

**Required:** Mock `after` in bot-api.test.ts as a no-op:

```typescript
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: vi.fn() };
});
```

This preserves `NextRequest`/`NextResponse` (used by all 100+ existing tests) and replaces only `after` with a no-op. Safe and minimal.

### Unit test: `triggerAutoTranslation()`

**File:** `src/lib/queries/generate-translations.test.ts`

Test directly (no `after()` involved):
1. When `generateAndStoreTranslations` succeeds → calls `markTranslationsReady` with suggestion ID
2. When `generateAndStoreTranslations` returns `{ success: false }` → does NOT call `markTranslationsReady`

Mock `generateAndStoreTranslations` (already mocked) + add mock for `markTranslationsReady`.

### Integration test: bot approve triggers translation

**File:** `src/app/api/bot/bot-api.test.ts`

With `after` mocked as `vi.fn()`, verify:
1. Existing approve test still passes (approval works, response is correct)
2. `after` was called (translation was scheduled)

## Phase 4: Verify ANTHROPIC_API_KEY on Vercel

Check `npx vercel env ls` from main repo root. Add to production + preview if missing.

## Files to modify

| File | Change |
|------|--------|
| `src/lib/queries/generate-translations.ts` | Add `triggerAutoTranslation()` |
| `src/app/api/bot/route.ts` | Import `after` + `triggerAutoTranslation`, call in approve case, update notification text |
| `src/lib/queries/generate-translations.test.ts` | Test `triggerAutoTranslation` |
| `scripts/seed-translations.ts` | Add 2 missing issues to ISSUES array |
| `translations/en.json` + `translations/*.json` | Regenerated by CLI pipeline |

## Not changing

- `src/app/api/suggestions/[id]/generate-translations/route.ts` — stays as manual retry/regenerate path
- Bot API response shape — unchanged
- `src/lib/ai.ts` — no changes needed

## Known limitations (pre-existing, not introduced by this change)

- `generateEntityTranslations()` uses max_tokens=16384. Very long descriptions (~2000 chars) across 55 locales could exceed this limit, causing truncated/malformed JSON. In practice, descriptions are short. The manual regenerate endpoint can do specific locales as a workaround.

## Verification

1. `npm test` — all pass including new tests
2. `npm run build` — clean
3. After deploy: Spanish issues page shows translated names for all issues
4. Future: approve a suggestion → it auto-advances to `translations_ready` within seconds

## Deployment

- Verify/add `ANTHROPIC_API_KEY` on Vercel production + preview
- Run CLI pipeline for 2 missing issues (`--generate` → `translate` → `--apply`) on staging + production
- No DB migrations
