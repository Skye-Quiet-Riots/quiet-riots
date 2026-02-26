import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

/** Singleton Anthropic client. Returns null if API key is not configured. */
function getAnthropicClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

/** Strip HTML tags from AI output as defence-in-depth. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * The 44 non-English locales supported by Quiet Riots.
 * Used for translation generation.
 */
export const SUPPORTED_LOCALES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el',
  'es', 'eu', 'fa', 'fi', 'fr', 'gl', 'he', 'hi',
  'hr', 'hu', 'id', 'it', 'ja', 'ko', 'ml', 'ms',
  'nl', 'no', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sk',
  'sl', 'sv', 'sw', 'ta', 'te', 'th', 'tl', 'tr',
  'uk', 'vi', 'zh-CN', 'zh-TW',
] as const;

/**
 * Translate text to English using Claude Haiku.
 * Returns the original text if:
 * - sourceLanguage is 'en'
 * - API key is not configured
 * - Translation fails (graceful degradation)
 */
export async function translateToEnglish(
  text: string,
  sourceLanguage: string,
): Promise<string> {
  if (sourceLanguage === 'en' || !text.trim()) return text;

  const anthropic = getAnthropicClient();
  if (!anthropic) return text;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Translate the following text from ${sourceLanguage} to English. Output ONLY the translation, nothing else. Do not add quotes or explanation.\n\n${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return stripHtml(content.text.trim());
    }
    return text;
  } catch (error) {
    console.error('translateToEnglish failed:', error);
    return text;
  }
}

/**
 * Generate translations for entity fields into all supported locales.
 * Makes a single API call with structured JSON output.
 *
 * @param fields - Map of field names to English values (e.g. { name: "...", description: "..." })
 * @param locales - List of locale codes to translate into (defaults to all 44)
 * @returns Map of locale → { field → translated value }
 */
export async function generateEntityTranslations(
  fields: Record<string, string>,
  locales: readonly string[] = SUPPORTED_LOCALES,
): Promise<Record<string, Record<string, string>>> {
  const anthropic = getAnthropicClient();
  if (!anthropic) return {};

  const fieldNames = Object.keys(fields);
  const fieldList = fieldNames.map((f) => `"${f}": "${fields[f]}"`).join(', ');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: `Translate the following fields into each of these ${locales.length} languages. Return ONLY valid JSON — no markdown fences, no explanation.

Fields to translate:
${fieldList}

Target locale codes: ${locales.join(', ')}

Rules:
- Keep brand names as-is: "Quiet Riots", "Quiet Rioters"
- Keep technical terms as-is: "IPO", "Pre-Seed"
- Keep currency amounts as-is: "$10m", "10p"
- Keep {variable} placeholders as-is
- Use natural, fluent translations appropriate for each locale

Return a JSON object where each key is a locale code, and the value is an object with the translated fields:
{
  "ar": { ${fieldNames.map((f) => `"${f}": "..."`).join(', ')} },
  "bg": { ${fieldNames.map((f) => `"${f}": "..."`).join(', ')} },
  ...
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return {};

    // Parse JSON, stripping any markdown fences the model may add
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonText) as Record<string, Record<string, string>>;

    // Validate and strip HTML from each value
    const result: Record<string, Record<string, string>> = {};
    for (const locale of locales) {
      if (parsed[locale] && typeof parsed[locale] === 'object') {
        result[locale] = {};
        for (const field of fieldNames) {
          const value = parsed[locale][field];
          if (typeof value === 'string' && value.trim()) {
            result[locale][field] = stripHtml(value.trim());
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('generateEntityTranslations failed:', error);
    return {};
  }
}
