# Plan: Localise suggestion review WhatsApp notifications

## Context

When a user submits a Quiet Riot suggestion in their language (e.g. Banglish), the approval/rejection/merge/more_info WhatsApp notifications are sent in hardcoded English. The user should receive these in the language they submitted in (`suggestion.language_code`).

**Scope:** WhatsApp messages only. Inbox subject/body stays English (separate concern).

## Design notes

- `getBotMessage(locale, key, params)` is async (loads from `messages/{locale}.json`)
- Web review route uses `sendNotification({ whatsAppSummary })` — clean separation, just await the message first
- Bot route uses `notifyUser(userId, type, subject, body)` which constructs `whatsappMessage` from `subject: body`. Need to add an optional `whatsappOverride` parameter to `notifyUser` so we can pass the localised message directly.
- Freeform guide text (rejection_detail, more_info notes) stays English — we localise the chrome around it
- `getBotMessage` lives in `src/app/api/bot/bot-messages.ts` — import path from web routes is fine for now

## Steps

### 1. Add BotMessages keys to `messages/en.json`

```
suggestionApproved: "Good news — your Quiet Riot \"{name}\" has been approved! We'll let you know when it goes live."
suggestionRejected: "Your suggestion \"{name}\" didn't get the 👍 because {reason}."
suggestionRejectedWithLink: "Your suggestion \"{name}\" didn't get the 👍 because {reason}. Learn more: https://www.quietriots.com/info/rejection-reasons"
suggestionMerged: "Your suggestion \"{name}\" is similar to an existing Quiet Riot. We've added you — check it out: {link}"
suggestionMoreInfo: "The Setup Guide has a question about \"{name}\": {notes}"
suggestionGoLive: "Your Quiet Riot \"{name}\" is now live! Share it with friends who care about this issue."
rejectionCloseToExisting: "too similar to an existing Quiet Riot"
rejectionAboutPeople: "it targets people rather than issues"
rejectionIllegalSubject: "it involves illegal activity"
```

Note: `rejectionOther` is omitted — the guide's own words are used directly.

### 2. Add `whatsappOverride` to `notifyUser` in bot route

Add optional param to `notifyUser` so the bot route can pass a pre-built localised WhatsApp message instead of deriving it from English subject+body.

```ts
async function notifyUser(
  userId, type, subject, body, entityType?, entityId?, senderName?,
  whatsappOverride?: string,  // NEW — localised WhatsApp message
)
```

In the function body: `whatsappMessage: user?.phone ? (whatsappOverride || \`${subject}: ${body.slice(0, 500)}\`) : undefined`

### 3. Localise notifications in web review route

`src/app/api/suggestions/[id]/review/route.ts`:

For each decision, build localised whatsAppSummary before calling sendNotification:

```ts
// approve
const whatsAppSummary = await getBotMessage(suggestion.language_code, 'suggestionApproved', { name: suggestion.suggested_name });

// reject
const localReason = reason === 'other' ? (detail || 'see details') : await getBotMessage(suggestion.language_code, rejectionKeyMap[reason]);
const whatsAppSummary = await getBotMessage(suggestion.language_code, 'suggestionRejectedWithLink', { name: suggestion.suggested_name, reason: localReason });

// merge
const whatsAppSummary = await getBotMessage(suggestion.language_code, 'suggestionMerged', { name: suggestion.suggested_name, link: `https://www.quietriots.com${mergeTargetPath}` });

// more_info
const whatsAppSummary = await getBotMessage(suggestion.language_code, 'suggestionMoreInfo', { name: suggestion.suggested_name, notes });
```

### 4. Localise notifications in bot route

`src/app/api/bot/route.ts` — same pattern in `review_suggestion` handler. Use `getBotMessage(suggestion.language_code, ...)` and pass as `whatsappOverride` to `notifyUser`.

### 5. Localise go-live notifications

Both `src/app/api/suggestions/[id]/go-live/route.ts` and bot `go_live_suggestion` handler — localise the First Rioter notification.

### 6. Translate to all 55 locales

Use the UI Translation Protocol: single Task agent for translations, then apply via script.

### 7. Tests

- Test that approve/reject/merge/more_info pass localised whatsAppSummary
- Test the `whatsappOverride` parameter on `notifyUser`

## Files to modify

- `messages/en.json` — add BotMessages keys
- `messages/*.json` (55 files) — translate new keys
- `src/app/api/bot/route.ts` — add whatsappOverride to notifyUser, use getBotMessage for review_suggestion + go_live_suggestion notifications
- `src/app/api/suggestions/[id]/review/route.ts` — use getBotMessage for whatsAppSummary
- `src/app/api/suggestions/[id]/go-live/route.ts` — use getBotMessage for whatsAppSummary
- `src/app/api/bot/bot-api.test.ts` — test localised notifications

## Verification

1. `npm test` — all tests pass
2. `npm run build` — builds cleanly
3. After deploy: approve a suggestion from a non-English user, verify WhatsApp message is in their language
