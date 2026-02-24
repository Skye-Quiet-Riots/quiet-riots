import { z } from 'zod';
import { getUserById, updateUser, getUserIssues } from '@/lib/queries/users';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const updateUserSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .transform((s) => sanitizeText(s))
    .optional(),
  email: z.string().email().max(255).optional(),
  time_available: z.string().max(50).optional(),
  skills: z
    .string()
    .max(500)
    .transform((s) => sanitizeText(s))
    .optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUserId = await getSession();
  if (!sessionUserId) {
    return apiError('Not logged in', 401);
  }

  const { id } = await params;
  if (sessionUserId !== id) {
    return apiError('Forbidden', 403);
  }

  const user = await getUserById(id);
  if (!user) {
    return apiError('User not found', 404);
  }

  const issues = await getUserIssues(user.id);
  return apiOk({ user, issues });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUserId = await getSession();
  if (!sessionUserId) {
    return apiError('Not logged in', 401);
  }

  const { id } = await params;
  if (sessionUserId !== id) {
    return apiError('Forbidden', 403);
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`user-patch:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const user = await updateUser(id, parsed.data);
  if (!user) {
    return apiError('User not found', 404);
  }
  return apiOk(user);
}
