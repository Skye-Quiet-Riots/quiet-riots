# Plan: Fix All Untranslated Assistant & Category Strings

## Problem

Multiple pages render assistant data and category names in English regardless of locale:
- Hardcoded English strings in 3 banner components
- Missing `translateCategoryAssistant(s)()` calls in 5 page components
- Missing translated `label` prop on `CategoryBadge` in assistant-card and assistant detail page

## Scope

### Phase 1: Add mandatory i18n rules to CLAUDE.md
- Add "Zero Tolerance for Hardcoded Strings" rules to prevent this recurring

### Phase 2: Add new message keys to en.json
New keys needed in `Assistants` namespace:
- `bannerTitle` — "{count} AI & Human Assistant Pairs"
- `bannerSubtitle` — "Every category has a dedicated AI agent and human organiser to help."
- `meetThem` — "Meet them →"
- `yourAssistants` — "Your {category} Assistants"
- `aiAgentLabel` — "(AI Agent)"
- `humanOrganiserLabel` — "(Human Organiser)"
- `currentFocus` — already exists in AssistantDetail
- `helpsWith` — "{name} helps with"
- `learnMore` — "Learn more about {agentName} & {humanName} →"

### Phase 3: Fix 3 banner components to use i18n
1. `assistant-overview-banner.tsx` — make async, use getTranslations('Assistants')
2. `assistant-banner.tsx` — make async, use getTranslations('Assistants') + getTranslations('Categories')
3. `assistant-detail-banner.tsx` — make async, use getTranslations('Assistants') + getTranslations('Categories')

### Phase 4: Fix 5 page components to translate DB data
1. `issues/page.tsx` — add translateCategoryAssistants() call
2. `issues/[id]/page.tsx` — add translateCategoryAssistant() call
3. `organisations/page.tsx` — add translateCategoryAssistants() call
4. `organisations/[id]/page.tsx` — add translateCategoryAssistant() call
5. `assistants/page.tsx` — add translateCategoryAssistants() call

### Phase 5: Fix CategoryBadge label translation
1. `assistant-card.tsx` — pass translated label to CategoryBadge
2. `assistants/[category]/page.tsx` — pass translated label to CategoryBadge + translate detail data

### Phase 6: Propagate new keys to all 55 locales
- Use Task agent to translate new Assistants keys
- Apply via Node.js script
- Validate all files

### Phase 7: Update tests, build, commit, PR

## Files to modify
- `CLAUDE.md` — add mandatory rules
- `messages/en.json` — add new keys
- `messages/*.json` — propagate translations (55 files)
- `src/components/data/assistant-overview-banner.tsx`
- `src/components/data/assistant-banner.tsx`
- `src/components/data/assistant-detail-banner.tsx`
- `src/components/cards/assistant-card.tsx`
- `src/app/[locale]/issues/page.tsx`
- `src/app/[locale]/issues/[id]/page.tsx`
- `src/app/[locale]/organisations/page.tsx`
- `src/app/[locale]/organisations/[id]/page.tsx`
- `src/app/[locale]/assistants/page.tsx`
- `src/app/[locale]/assistants/[category]/page.tsx`
- `src/components/data/data.test.tsx` — update tests for async components
