/**
 * Input sanitization helpers.
 * Use these as Zod .transform() steps or standalone utilities.
 */

/**
 * Validate and normalize a phone number to E.164 format.
 * Throws if the phone number is not valid E.164.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!/^\+[1-9]\d{6,14}$/.test(trimmed)) {
    throw new Error(`Invalid E.164 phone number: ${trimmed}`);
  }
  return trimmed;
}

/**
 * Trim whitespace and truncate to a maximum length.
 */
export function trimAndLimit(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

/**
 * Trim whitespace and strip control characters (except newlines and tabs).
 * Useful for user-generated text content like feed posts.
 */
export function sanitizeText(text: string): string {
  return text.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize translation values for DB insertion.
 * Uses an allowlist approach: translations must be plain text only.
 * Strips HTML tags and rejects dangerous URL schemes.
 * Throws if the value contains injection patterns.
 */
export function sanitizeTranslation(text: string, maxLength?: number): string {
  const trimmed = sanitizeText(text);

  // Reject dangerous URL schemes (case-insensitive)
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    lower.includes('vbscript:')
  ) {
    throw new Error(`Translation contains dangerous URL scheme: ${trimmed.slice(0, 100)}`);
  }

  // Strip any HTML tags (allowlist: plain text only)
  const stripped = trimmed.replace(/<[^>]+>/g, '');

  // Enforce max length if specified
  if (maxLength && stripped.length > maxLength) {
    return stripped.slice(0, maxLength);
  }

  return stripped;
}
