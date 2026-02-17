import { z } from 'zod';
import { getUserById, updateUser, getUserIssues } from '@/lib/queries/users';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  time_available: z.string().optional(),
  skills: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return apiError('User not found', 404);
  }

  const issues = await getUserIssues(user.id);
  return apiOk({ user, issues });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`user-patch:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join(', ');
    return apiError(msg);
  }

  const user = await updateUser(id, parsed.data);
  if (!user) {
    return apiError('User not found', 404);
  }
  return apiOk(user);
}
