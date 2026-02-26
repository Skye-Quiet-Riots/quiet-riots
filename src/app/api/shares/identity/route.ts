import { z } from 'zod';
import { getSession } from '@/lib/session';
import { submitIdentity } from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const identitySchema = z.object({
  legalFirstName: z
    .string()
    .min(1, 'First name required')
    .max(200)
    .transform((s) => sanitizeText(s)),
  legalMiddleName: z
    .string()
    .max(200)
    .transform((s) => sanitizeText(s))
    .optional()
    .nullable(),
  legalLastName: z
    .string()
    .min(1, 'Last name required')
    .max(200)
    .transform((s) => sanitizeText(s)),
  dateOfBirth: z.string().min(1, 'Date of birth required').max(20),
  gender: z
    .enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'])
    .optional()
    .nullable(),
  addressLine1: z
    .string()
    .min(1, 'Address required')
    .max(200)
    .transform((s) => sanitizeText(s)),
  addressLine2: z
    .string()
    .max(200)
    .transform((s) => sanitizeText(s))
    .optional()
    .nullable(),
  city: z
    .string()
    .min(1, 'City required')
    .max(200)
    .transform((s) => sanitizeText(s)),
  stateProvince: z
    .string()
    .max(200)
    .transform((s) => sanitizeText(s))
    .optional()
    .nullable(),
  postalCode: z
    .string()
    .max(20)
    .transform((s) => sanitizeText(s))
    .optional()
    .nullable(),
  countryCode: z.string().min(2, 'Country required').max(3),
  phone: z.string().min(1, 'Phone required').max(20),
  idDocumentType: z
    .enum(['passport', 'national_id', 'driving_licence', 'other'])
    .optional()
    .nullable(),
  idDocumentCountry: z.string().max(3).optional().nullable(),
});

/**
 * POST /api/shares/identity — Submit/update identity form
 */
export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-identity:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();
  const parsed = identitySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const result = await submitIdentity(userId, parsed.data);
  if (!result.success) {
    return apiError(result.error || 'Failed to submit identity', 400);
  }

  return apiOk({ submitted: true });
}
