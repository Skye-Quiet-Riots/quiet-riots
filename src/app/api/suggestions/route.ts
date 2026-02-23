import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuggestion } from '@/lib/queries/assistants';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const suggestionSchema = z.object({
  user_id: z.string().min(1, 'User ID required'),
  issue_id: z.string().min(1, 'Issue ID required'),
  suggestion_text: z.string().min(1, 'Suggestion text required').max(2000),
});

export async function POST(request: NextRequest) {
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
      parsed.data.user_id,
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
