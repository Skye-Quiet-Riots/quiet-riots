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
