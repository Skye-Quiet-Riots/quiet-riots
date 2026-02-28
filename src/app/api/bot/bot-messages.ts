/**
 * Locale-aware bot message helper.
 *
 * Loads translations from messages/{locale}.json using dynamic import.
 * Node.js module cache ensures each locale file is read from disk only once.
 */

type MessageParams = Record<string, string | number>;

interface MessagesFile {
  BotMessages?: Record<string, string>;
}

const messageCache = new Map<string, Record<string, string>>();

async function loadBotMessages(locale: string): Promise<Record<string, string>> {
  const cached = messageCache.get(locale);
  if (cached) return cached;

  try {
    const mod: MessagesFile = await import(`../../../../messages/${locale}.json`);
    const messages = mod.BotMessages ?? {};
    messageCache.set(locale, messages);
    return messages;
  } catch {
    // Fall back to English
    if (locale !== 'en') {
      return loadBotMessages('en');
    }
    return {};
  }
}

/**
 * Get a translated bot message by key with optional parameter substitution.
 *
 * @param locale - e.g. 'es', 'fr', 'ar'
 * @param key - key from BotMessages namespace (e.g. 'noMoreReels')
 * @param params - optional string interpolation values (e.g. { name: 'Spark' })
 * @returns translated string with parameters substituted
 */
export async function getBotMessage(
  locale: string,
  key: string,
  params?: MessageParams,
): Promise<string> {
  const messages = await loadBotMessages(locale);
  let text = messages[key];

  // Fall back to English if key not found in target locale
  if (!text && locale !== 'en') {
    const enMessages = await loadBotMessages('en');
    text = enMessages[key];
  }

  if (!text) {
    // Key not found anywhere — return key as-is for debugging
    return key;
  }

  // Substitute {param} placeholders
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}
