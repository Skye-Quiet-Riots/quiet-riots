# Fix: Suggestion translation generation UX

## Context

When a Setup Guide approves a suggestion on the web dashboard, translations are triggered client-side. If the Claude API call fails or times out (~15-30s for 55 locales), the dashboard shows a scary red "Translation generation failed." with a Retry button. This looks broken when things are actually fine — the translation may just need a retry, or `after()` may have handled it server-side already.

The bot route already handles this correctly using `after()` server-side. The web dashboard doesn't.

## Approach (Option B from review — simple, low-risk)

Three changes:
1. Add `after()` to the review route so translations are triggered server-side automatically (like the bot route)
2. Stop auto-triggering translations from the client on approval
3. Change the approved-status UI to show calm messaging with a manual "Generate translations" fallback button

No polling. No migrations. No removal of working endpoints. The existing `/api/suggestions/[id]/generate-translations` endpoint stays as the manual fallback.

## Changes

### 1. Add `after()` to review route

**File:** `src/app/api/suggestions/[id]/review/route.ts`

In the `approve` case (before the return on line 77), add:

```ts
import { after } from 'next/server';
import { triggerAutoTranslation } from '@/lib/queries/generate-translations';

// After approval, trigger translation generation server-side
const entityType = suggestion.suggested_type === 'issue' ? 'issue' : 'organisation';
const entityId = (result.issue_id || result.organisation_id) as string | undefined;
if (entityId) {
  const fields: Record<string, string> = { name: suggestion.suggested_name };
  if (suggestion.description) fields.description = suggestion.description;
  after(() => triggerAutoTranslation(id, entityType, entityId, fields).catch(() => {}));
}
```

This is the exact same pattern as bot route line 1512.

### 2. Simplify dashboard approved-state UI

**File:** `src/components/interactive/setup-dashboard.tsx`

- Remove: `generatingId` state, `generationError` state, `triggerTranslationGeneration()` function
- Remove: the auto-trigger call `triggerTranslationGeneration(id)` from `handleReview()` on approval
- Replace the approved-status block (lines 395-419) with:
  - Message: "Translations are being generated automatically — refresh in about 30 seconds."
  - Below: a "Generate translations" button (using existing `/api/suggestions/{id}/generate-translations` endpoint) as fallback if auto-generation failed. This button shows spinner while working and success/error feedback.

The key difference: the initial state is calm ("being generated automatically") rather than immediately triggering a client-side call that shows a scary error on failure. If the guide needs to intervene, the manual button is there.

### 3. Update i18n keys

**File:** `messages/en.json`

- `generatingTranslations` → keep (used for button spinner state)
- `translationFailed` → change value to "Translation took longer than expected."
- `retryTranslations` → change value to "Generate translations"
- `translationsPending` → change value to "Translations are being generated automatically — refresh in about 30 seconds."

Translate changed values to all 55 locales via `scripts/apply-ui-translations.js`.

## What stays the same

- `/api/suggestions/[id]/generate-translations` endpoint — kept as manual fallback
- `triggerAutoTranslation()` function — used by both bot and web routes
- `translations_ready` → "Review Translations" → "Go Live" flow — unchanged
- Bot route's existing `after()` — unchanged

## Files to modify

1. `src/app/api/suggestions/[id]/review/route.ts` — add `after()` (5 lines)
2. `src/components/interactive/setup-dashboard.tsx` — simplify UI states
3. `messages/en.json` — update 3-4 key values
4. `messages/*.json` — translate via script (55 locales)

## Verification

1. `npm test && npm run build`
2. Approve a suggestion → see "being generated automatically" message (not an error)
3. Refresh after ~30s → status should be `translations_ready`
4. If not ready: click "Generate translations" → see spinner → see result
