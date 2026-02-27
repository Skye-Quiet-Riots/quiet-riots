import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getUserById, updateUser } from '@/lib/queries/users';
import { saveUserInterests, getUserInterests } from '@/lib/queries/interests';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { CATEGORIES } from '@/types';
import { isValidLocale } from '@/i18n/locales';

const onboardingSchema = z.object({
  interests: z
    .array(z.enum(CATEGORIES as unknown as [string, ...string[]]))
    .min(1, 'Select at least one interest')
    .max(16),
  language_code: z
    .string()
    .min(2)
    .max(10)
    .optional()
    .transform((v) => (v && isValidLocale(v) ? v : undefined)),
  country_code: z.string().length(2).optional(),
});

export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`onboarding:${userId}`, {
    maxRequests: 10,
    windowMs: 3_600_000,
  });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { interests, language_code, country_code } = parsed.data;

  // Save interests
  await saveUserInterests(userId, interests);

  // Update preferences + mark onboarding complete
  const updates: Record<string, string | number> = { onboarding_completed: 1 };
  if (language_code) updates.language_code = language_code;
  if (country_code) updates.country_code = country_code;

  await updateUser(userId, updates as Parameters<typeof updateUser>[1]);

  const user = await getUserById(userId);
  const savedInterests = await getUserInterests(userId);

  return apiOk({ user, interests: savedInterests }, 201);
}

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 404);
  }

  const interests = await getUserInterests(userId);
  return apiOk({ onboarding_completed: user.onboarding_completed, interests });
}
