import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAssistantClaim, getAssistantByCategory } from '@/lib/queries/assistants';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { getUserById } from '@/lib/queries/users';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory } from '@/types';

const claimSchema = z.object({
  message: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;

  if (!ASSISTANT_CATEGORIES.includes(category as AssistantCategory)) {
    return apiError('Invalid category', 400);
  }

  const userId = request.cookies.get('qr_user_id')?.value;
  if (!userId) {
    return apiError('Not authenticated', 401);
  }

  const user = await getUserById(userId);
  if (!user) {
    return apiError('User not found', 401);
  }

  const { allowed } = rateLimit(`claim:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const assistant = await getAssistantByCategory(category);
  if (!assistant) {
    return apiError('Assistant pair not found', 404);
  }

  const body = await request.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const claim = await createAssistantClaim(category, userId, parsed.data.message);
  return apiOk(claim, 201);
}
