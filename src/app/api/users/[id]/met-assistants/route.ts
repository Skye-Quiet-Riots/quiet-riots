import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getUserMetAssistants,
  recordAssistantIntroduction,
} from '@/lib/queries/assistants';
import { getUserById } from '@/lib/queries/users';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUserById(id);
  if (!user) {
    return apiError('User not found', 404);
  }

  const met = await getUserMetAssistants(id);
  return apiOk({ met });
}

const introSchema = z.object({
  category: z.string().min(1, 'Category required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUserById(id);
  if (!user) {
    return apiError('User not found', 404);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`met-assistants:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = introSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  if (!ASSISTANT_CATEGORIES.includes(parsed.data.category as AssistantCategory)) {
    return apiError('Invalid category', 400);
  }

  const intro = await recordAssistantIntroduction(id, parsed.data.category);
  return apiOk(intro, 201);
}
