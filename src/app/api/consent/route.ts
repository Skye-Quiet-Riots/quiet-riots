import { z } from 'zod';
import { getSession } from '@/lib/session';
import { recordConsent } from '@/lib/queries/privacy';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const consentSchema = z.object({
  documentType: z.enum(['terms', 'privacy', 'cookie', 'analytics']),
  version: z.string().min(1).max(50),
  countryCode: z.string().min(1).max(3),
});

export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const body = await request.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  const consent = await recordConsent(
    userId,
    parsed.data.documentType,
    parsed.data.version,
    parsed.data.countryCode,
    ipAddress,
    userAgent,
  );

  return apiOk(consent, 201);
}
