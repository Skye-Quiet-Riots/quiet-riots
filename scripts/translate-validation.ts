/**
 * Validation helpers for the translation pipeline.
 * Extracted for testability. Used by scripts/translate.ts.
 */

/** Brand names that must be preserved exactly in translations */
export const BRAND_NAMES = ['Quiet Riot', 'Quiet Riots', 'Quiet Rioters'];

/** Max length constraints matching DB CHECK constraints */
export const MAX_LENGTHS: Record<string, Record<string, number>> = {
  categories: { _value: 255 },
  issues: { name: 255, description: 2000 },
  organisations: { name: 255, description: 2000 },
  synonyms: { _value: 255 },
  category_assistants: {
    agent_quote: 2000,
    human_quote: 2000,
    agent_bio: 2000,
    human_bio: 2000,
    goal: 2000,
    focus: 255,
    focus_detail: 2000,
  },
  actions: { title: 255, description: 2000 },
  expert_profiles: { role: 255, speciality: 255, achievement: 2000 },
  riot_reels: { title: 255, caption: 2000 },
  action_initiatives: { title: 255, description: 2000 },
};

/** Extract {placeholder} tokens from a string */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[^}]+\}/g);
  return matches ? matches.sort() : [];
}

/** Recursively collect all string values from an object (for deep validation) */
export function collectStringValues(
  obj: unknown,
  path: string = '',
): { path: string; value: string }[] {
  if (typeof obj === 'string') return [{ path, value: obj }];
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => collectStringValues(item, `${path}[${i}]`));
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).flatMap(([key, val]) =>
      collectStringValues(val, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

/**
 * Validate a translated section against the original English.
 * Returns an array of error/warning messages.
 */
export function validateTranslation(
  original: Record<string, unknown>,
  translated: Record<string, unknown>,
  section: string,
  locale: string,
): string[] {
  const errors: string[] = [];

  const origKeys = Object.keys(original).sort();
  const transKeys = Object.keys(translated).sort();

  // 1. Key count check
  if (origKeys.length !== transKeys.length) {
    errors.push(
      `${locale}/${section}: Key count mismatch — expected ${origKeys.length}, got ${transKeys.length}`,
    );
  }

  for (const key of origKeys) {
    if (!(key in translated)) {
      errors.push(`${locale}/${section}: Missing key "${key}"`);
    }
  }

  for (const key of transKeys) {
    if (!(key in original)) {
      errors.push(`${locale}/${section}: Extra key "${key}"`);
    }
  }

  // 2. Deep structure validation — verify nested keys match
  for (const key of origKeys) {
    if (!(key in translated)) continue;
    const origVal = original[key];
    const transVal = translated[key];

    if (typeof origVal === 'object' && origVal !== null && !Array.isArray(origVal)) {
      const origSubKeys = Object.keys(origVal as Record<string, unknown>).sort();
      if (typeof transVal === 'object' && transVal !== null && !Array.isArray(transVal)) {
        const transSubKeys = Object.keys(transVal as Record<string, unknown>).sort();
        if (JSON.stringify(origSubKeys) !== JSON.stringify(transSubKeys)) {
          errors.push(
            `${locale}/${section}/${key}: Nested key mismatch — expected [${origSubKeys.join(', ')}], got [${transSubKeys.join(', ')}]`,
          );
        }
      } else {
        errors.push(
          `${locale}/${section}/${key}: Expected object, got ${typeof transVal}`,
        );
      }
    }
  }

  // 3. Placeholder preservation check
  const origStrings = collectStringValues(original);
  const transStrings = collectStringValues(translated);

  for (const { path, value: origValue } of origStrings) {
    const origPlaceholders = extractPlaceholders(origValue);
    if (origPlaceholders.length === 0) continue;

    const transEntry = transStrings.find((s) => s.path === path);
    if (!transEntry) continue;

    const transPlaceholders = extractPlaceholders(transEntry.value);
    for (const placeholder of origPlaceholders) {
      if (!transPlaceholders.includes(placeholder)) {
        errors.push(
          `${locale}/${section}/${path}: Missing placeholder ${placeholder}`,
        );
      }
    }
  }

  // 4. Brand name preservation check
  for (const { path, value: origValue } of origStrings) {
    for (const brand of BRAND_NAMES) {
      if (!origValue.includes(brand)) continue;
      const transEntry = transStrings.find((s) => s.path === path);
      if (!transEntry) continue;
      if (!transEntry.value.includes(brand)) {
        errors.push(
          `${locale}/${section}/${path}: Brand name "${brand}" was translated — must be preserved`,
        );
      }
    }
  }

  // 5. Max-length validation
  const sectionLimits = MAX_LENGTHS[section];
  if (sectionLimits) {
    for (const { path, value: transValue } of transStrings) {
      // Get the field name from the path (last segment)
      const fieldName = path.split('.').pop() || '';
      const maxLen = sectionLimits[fieldName] || sectionLimits['_value'];
      if (maxLen && transValue.length > maxLen) {
        errors.push(
          `${locale}/${section}/${path}: Exceeds max length ${maxLen} (got ${transValue.length})`,
        );
      }
    }
  }

  return errors;
}

/**
 * Normalize translated keys to match the English baseline.
 *
 * For `issue_per_riot`, the AI translator sometimes uses translated issue names
 * as keys (e.g. "Retrasos en Vuelos" instead of "Flight Delays"). This function
 * remaps those keys back to English using a reverse lookup from the `issues` section.
 *
 * For other sections, keys should never change (they're video IDs, expert names, etc.),
 * so we only warn about mismatches without auto-fixing.
 *
 * Returns the normalized result and a list of fixes/warnings applied.
 */
export function normalizeTranslatedKeys(
  section: string,
  englishBaseline: Record<string, unknown>,
  translated: Record<string, unknown>,
  fullLocaleData: Record<string, unknown>,
): { normalized: Record<string, unknown>; fixes: string[] } {
  const fixes: string[] = [];
  const enKeys = new Set(Object.keys(englishBaseline));
  const normalized: Record<string, unknown> = {};

  // Build reverse lookup: translated issue name → English issue name
  // Only useful for issue_per_riot section
  const translatedNameToEnglish = new Map<string, string>();
  if (section === 'issue_per_riot' && fullLocaleData.issues) {
    const issuesSection = fullLocaleData.issues as Record<
      string,
      { name?: string }
    >;
    for (const [enName, entry] of Object.entries(issuesSection)) {
      if (entry && entry.name) {
        translatedNameToEnglish.set(entry.name, enName);
      }
    }
  }

  // Process each key in the translated output
  for (const [key, value] of Object.entries(translated)) {
    if (enKeys.has(key)) {
      // Key matches English baseline — keep as-is
      normalized[key] = value;
    } else if (section === 'issue_per_riot') {
      // Try reverse lookup from translated issue name
      const englishKey = translatedNameToEnglish.get(key);
      if (englishKey && enKeys.has(englishKey)) {
        normalized[englishKey] = value;
        fixes.push(`Remapped translated key "${key}" → "${englishKey}"`);
      } else {
        // Unknown key — keep it and warn
        normalized[key] = value;
        fixes.push(`Unknown key "${key}" (not in English baseline, no reverse match)`);
      }
    } else {
      // Non-issue_per_riot section with wrong key — warn but keep
      normalized[key] = value;
      fixes.push(`Unknown key "${key}" in ${section} (not in English baseline)`);
    }
  }

  // Fill missing English keys with baseline values as fallback
  for (const enKey of enKeys) {
    if (!(enKey in normalized)) {
      normalized[enKey] = englishBaseline[enKey];
      fixes.push(`Missing key "${enKey}" — filled with English baseline`);
    }
  }

  return { normalized, fixes };
}
