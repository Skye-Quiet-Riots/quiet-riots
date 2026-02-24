import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuggestion } from '@/lib/queries/assistants';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const suggestionSchema = z.object({
  issue_id: z.string().min(1, 'Issue ID required'),
  suggestion_text: z
    .string()
    .min(1, 'Suggestion text required')
    .max(2000)
    .transform((s) => sanitizeText(s)),
});

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`suggestion:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = suggestionSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  try {
    const result = await createSuggestion(
      userId,
      parsed.data.issue_id,
      parsed.data.suggestion_text,
    );
    return apiOk(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Issue not found') {
      return apiError('Issue not found', 404);
    }
    throw error;
  }
}
