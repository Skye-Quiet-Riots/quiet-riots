# Plan: Complete Translation Coverage — Web + WhatsApp

## Context

The Spanish issue detail page shows English text for `agent_helps`, `human_helps`, `agent_focus`, `human_focus`. Root cause: the translation overlay hardcodes which fields to translate, and the WhatsApp bot has hardcoded English system messages.

## Tier 1: Generic Translation Overlay

**Problem:** `translateEntity()` only overlays `name` + `description`. Every new text field is missed.

**Fix:** Add `translateAny()` to `src/lib/queries/translate.ts` — generic overlay that applies ALL translation rows for an entity.

```typescript
export async function translateAny<T extends { id: string }>(
  entities: T[], entityType: string, locale: string
): Promise<T[]>
```

Safety: only overlays fields that (a) exist on the entity, (b) are currently `string | null`, (c) have a non-empty translation value. Prevents rogue translation rows from corrupting numeric fields.

Refactor all existing translate functions to delegate to `translateAny`. Remove `ASSISTANT_TRANSLATABLE_FIELDS` allowlist. Keep existing signatures — no callers break.

Pivot row functions stay custom (map across entity boundaries).

**Seed pipeline:** Add `PER_RIOT_COPY` data + `issue_per_riot` section to `scripts/seed-translations.ts`. Add to `VALID_SECTIONS` in `scripts/translate.ts`.

**Files:**
- `src/lib/queries/translate.ts` — add `translateAny()`, refactor
- `src/lib/queries/translate.test.ts` — tests for generic overlay + type safety
- `scripts/seed-translations.ts` — `issue_per_riot` section
- `scripts/translate.ts` — add to `VALID_SECTIONS`

## Tier 2: Missing Entity Translations in Bot Actions

**Problem:** Two bot actions return translatable entities without translating them.

**Fix:** Call `resolveLocale(p)` (already exists, falls back to user's stored `language_code`) and translate responses.

| Action | Fix |
|--------|-----|
| `get_riot_reel` | Translate reel with `translateRiotReels()` before returning |
| `record_assistant_introduction` | Translate assistant with `translateCategoryAssistant()` before returning |

**Not in scope** (user-generated content, not translatable entities): suggestion actions (`get_suggestion_status`, `get_pending_suggestions`, etc.) return user-submitted text, not DB entities with translations.

**File:** `src/app/api/bot/route.ts`

## Tier 3: Hardcoded English Bot Response Messages

**Problem:** ~15 user-facing hardcoded English strings in bot responses (shown to WhatsApp users). Admin notifications to Setup Guides are internal and stay English for now.

**Approach:**
1. Add `BotMessages` namespace to `messages/en.json`
2. Create `src/app/api/bot/bot-messages.ts` — `getBotMessage(locale, key, params?)` helper using the dynamic import pattern from `reset-password-email.ts` (Node.js module cache prevents re-reads)
3. Replace hardcoded strings with `getBotMessage()` calls
4. Translate to 55 locales via standard UI translation protocol

**Messages to add:**

```
BotMessages.noMoreReels             "No more unseen reels for this issue"
BotMessages.youAreLive              "You are live! Be passionate but respectful."
BotMessages.responseSentToGuide     "Your response has been sent to the Setup Guide."
BotMessages.suggestionLive          "{name} is now live!"
BotMessages.verificationEmailSent   "Verification email sent to {email}"
BotMessages.emailVerified           "Your email {email} is verified"
BotMessages.emailNotVerified        "Your email {email} is not yet verified..."
BotMessages.shareIssued             "Your share has been issued! Certificate: {url}"
BotMessages.shareNeedMore           "You need {count} more Quiet Riots to qualify..."
BotMessages.shareEligible           "You are eligible for a Quiet Riots share!..."
BotMessages.shareUnderReview        "Your share application is under review..."
BotMessages.shareApplied            "10p has been deducted... Your share application..."
BotMessages.shareDeclined           "You have permanently declined your share offer..."
BotMessages.shareWithdrawn          "Your share application has been withdrawn..."
BotMessages.shareReapplied          "10p has been deducted... Your share re-application..."
BotMessages.shareQuestionSent       "Your question has been sent..."
```

**Files:**
- `messages/en.json` — add `BotMessages` namespace
- `messages/*.json` (55 files) — translate via standard protocol
- `src/app/api/bot/bot-messages.ts` (new) — helper
- `src/app/api/bot/route.ts` — replace hardcoded strings

## Implementation Order

1. `translateAny()` + refactor + tests → commit + push
2. Seed pipeline for per-riot copy → commit + push
3. Bot entity translation fixes (2 actions) → commit + push
4. `BotMessages` namespace + helper + replace hardcoded strings → commit + push
5. Translate `BotMessages` to 55 locales → commit + push
6. Generate + apply per-riot translations (post-merge)

## Verification

1. `npm test` + `npm run build` after each phase
2. Spanish issue detail page shows translated per-riot copy (after translations applied)
3. Bot `get_riot_reel` returns translated reel for non-English users
4. Bot `record_assistant_introduction` returns translated assistant
5. Bot share scheme / suggestion responses use locale-appropriate text
