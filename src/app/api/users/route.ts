import { z } from 'zod';
import { createUser, getUserByEmail } from '@/lib/queries/users';
import { setSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const createUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name required')
    .max(255)
    .transform((s) => sanitizeText(s)),
  email: z.string().email('Valid email required').max(255),
  time_available: z.string().max(50).optional().default('10min'),
  skills: z
    .string()
    .max(500)
    .transform((s) => sanitizeText(s))
    .optional()
    .default(''),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`users:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { name, email, time_available, skills } = parsed.data;

  // Check if user already exists
  const existing = await getUserByEmail(email);
  if (existing) {
    await setSession(existing.id);
    return apiOk(existing);
  }

  const user = await createUser({ name, email, time_available, skills });
  await setSession(user.id);
  return apiOk(user);
}
