import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.SHARE_IDENTITY_KEY;
  if (!key) throw new Error('SHARE_IDENTITY_KEY environment variable is not set');
  // Key must be 32 bytes (64 hex chars) for AES-256
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== 32) {
    throw new Error('SHARE_IDENTITY_KEY must be 64 hex characters (32 bytes)');
  }
  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns `{iv}:{authTag}:{ciphertext}` (all hex-encoded).
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string encrypted by `encryptField()`.
 * Input format: `{iv}:{authTag}:{ciphertext}` (all hex-encoded).
 */
export function decryptField(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted field format — expected iv:authTag:ciphertext');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Fields in share_identities that contain PII and must be encrypted.
 */
export const PII_FIELDS = [
  'legal_first_name',
  'legal_middle_name',
  'legal_last_name',
  'date_of_birth',
  'address_line_1',
  'address_line_2',
  'city',
  'state_province',
  'postal_code',
  'phone',
] as const;

/**
 * Encrypt all PII fields in an identity data object.
 * Null/undefined fields are left as-is.
 */
export function encryptIdentityFields(
  data: Record<string, string | null | undefined>,
): Record<string, string | null | undefined> {
  const result = { ...data };
  for (const field of PII_FIELDS) {
    const value = result[field];
    if (value != null && value !== '') {
      result[field] = encryptField(value);
    }
  }
  return result;
}

/**
 * Decrypt all PII fields in an identity row from the database.
 * Null fields are left as-is.
 */
export function decryptIdentityFields(
  row: Record<string, string | number | null>,
): Record<string, string | number | null> {
  const result = { ...row };
  for (const field of PII_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value.includes(':')) {
      try {
        result[field] = decryptField(value);
      } catch {
        // If decryption fails, leave the field as-is (e.g. already plain text in tests)
        // This should be logged in production
      }
    }
  }
  return result;
}
