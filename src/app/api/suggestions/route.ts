import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuggestion as createIdeaSuggestion } from '@/lib/queries/assistants';
import {
  getSuggestionsByStatus,
  createSuggestion as createIssueSuggestion,
  getCloseMatches,
} from '@/lib/queries/suggestions';
import { createIssue } from '@/lib/queries/issues';
import { createOrganisation } from '@/lib/queries/organisations';
import { joinIssue } from '@/lib/queries/users';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';
import { getUserById } from '@/lib/queries/users';
import { translateToEnglish } from '@/lib/ai';
import type { Category, SuggestedType, SuggestionStatus } from '@/types';

// Schema for the original "idea suggestion" for existing issues
const ideaSuggestionSchema = z.object({
  issue_id: z.string().min(1, 'Issue ID required'),
  suggestion_text: z
    .string()
    .min(1, 'Suggestion text required')
    .max(2000)
    .transform((s) => sanitizeText(s)),
});

// Schema for the new "quiet riot suggestion" (full pipeline)
const riotSuggestionSchema = z.object({
  suggested_name: z
    .string()
    .min(1, 'Name required')
    .max(255)
    .transform((s) => sanitizeText(s)),
  original_text: z
    .string()
    .min(1, 'Original text required')
    .max(1000)
    .transform((s) => sanitizeText(s)),
  suggested_type: z.enum(['issue', 'organisation']).optional().default('issue'),
  category: z.enum([
    'Transport',
    'Telecoms',
    'Banking',
    'Health',
    'Education',
    'Environment',
    'Energy',
    'Water',
    'Insurance',
    'Housing',
    'Shopping',
    'Delivery',
    'Local',
    'Employment',
    'Tech',
    'Other',
  ]),
  description: z
    .string()
    .max(2000)
    .transform((s) => sanitizeText(s))
    .optional()
    .default(''),
  public_recognition: z.boolean().optional().default(true),
});

/** GET /api/suggestions — list suggestions (setup_guide/admin only) */
export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') as SuggestionStatus | null;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const suggestions = await getSuggestionsByStatus(status ?? undefined, limit, offset);
  return apiOk({ suggestions });
}

/** POST /api/suggestions — backward compatible: detect schema and route accordingly */
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`suggestion:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const body = await request.json();

  // Backward compatibility: if body has issue_id + suggestion_text, it's the old schema
  if (body.issue_id && body.suggestion_text) {
    const parsed = ideaSuggestionSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    try {
      const result = await createIdeaSuggestion(
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

  // New schema: full Quiet Riot suggestion
  const parsed = riotSuggestionSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const {
    suggested_name,
    original_text,
    suggested_type,
    category,
    description,
    public_recognition,
  } = parsed.data;

  // Translate to English if user's language is not English
  const user = await getUserById(userId);
  const userLang = user?.language_code || 'en';
  const englishName =
    userLang !== 'en' ? await translateToEnglish(suggested_name, userLang) : suggested_name;
  const englishDescription =
    userLang !== 'en' && description ? await translateToEnglish(description, userLang) : description;

  // Create pending entity
  let entityId: string;
  if (suggested_type === 'issue') {
    const issue = await createIssue({
      name: englishName,
      category: category as Category,
      description: englishDescription,
      status: 'pending_review',
      first_rioter_id: userId,
    });
    entityId = issue.id;
    await joinIssue(userId, issue.id);
  } else {
    const org = await createOrganisation({
      name: englishName,
      category: category as Category,
      description: englishDescription,
      status: 'pending_review',
      first_rioter_id: userId,
    });
    entityId = org.id;
  }

  const closeMatches = await getCloseMatches(
    englishName,
    category as Category,
    suggested_type as SuggestedType,
  );

  const suggestion = await createIssueSuggestion({
    suggestedBy: userId,
    originalText: original_text,
    suggestedName: englishName,
    suggestedType: suggested_type as SuggestedType,
    category: category as Category,
    description: englishDescription,
    issueId: suggested_type === 'issue' ? entityId : undefined,
    organisationId: suggested_type === 'organisation' ? entityId : undefined,
    closeMatchIds: closeMatches.map((m) => m.id),
    publicRecognition: public_recognition ? 1 : 0,
    languageCode: userLang,
  });

  return apiOk(
    { suggestion, entity_id: entityId, entity_type: suggested_type, close_matches: closeMatches },
    201,
  );
}
