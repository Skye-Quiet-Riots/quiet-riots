import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/queries/privacy';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const prefs = await getNotificationPreferences(userId);
  return apiOk(prefs);
}

const updateSchema = z.object({
  security: z
    .boolean()
    .transform((v) => (v ? 1 : 0))
    .optional(),
  product_updates: z
    .boolean()
    .transform((v) => (v ? 1 : 0))
    .optional(),
  campaign_updates: z
    .boolean()
    .transform((v) => (v ? 1 : 0))
    .optional(),
  weekly_digest: z
    .boolean()
    .transform((v) => (v ? 1 : 0))
    .optional(),
});

export async function PUT(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const updated = await updateNotificationPreferences(userId, parsed.data);
  return apiOk(updated);
}
