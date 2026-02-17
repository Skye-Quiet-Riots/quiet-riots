import { z } from 'zod';
import { createUser, getUserByEmail } from '@/lib/queries/users';
import { setSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  time_available: z.string().optional().default('10min'),
  skills: z.string().optional().default(''),
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
    const msg = parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join(', ');
    return apiError(msg);
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
