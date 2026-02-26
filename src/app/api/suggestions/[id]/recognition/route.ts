import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getSuggestionById, setPublicRecognition } from '@/lib/queries/suggestions';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const schema = z.object({
  public_recognition: z.boolean(),
});

/** POST /api/suggestions/[id]/recognition — set public/anonymous preference */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`recognition:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);

  // Only the person who suggested it can change recognition preference
  if (suggestion.suggested_by !== userId) {
    return apiError('Only the First Rioter can change recognition preference', 403);
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const updated = await setPublicRecognition(id, parsed.data.public_recognition ? 1 : 0);
  return apiOk({ suggestion: updated });
}
