import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSuggestionById } from '@/lib/queries/suggestions';
import { generateAndStoreTranslations } from '@/lib/queries/generate-translations';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { nonEnLocaleSchema } from '@/i18n/locales';

const regenerateSchema = z.object({
  locales: z.array(nonEnLocaleSchema).min(1, 'At least one locale required'),
});

/** POST /api/suggestions/[id]/translations/regenerate — regenerate for specific locales */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`regen-translations:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);

  const body = await request.json();
  const parsed = regenerateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const entityType = suggestion.suggested_type === 'issue' ? 'issue' : 'organisation';
  const entityId = suggestion.issue_id || suggestion.organisation_id;
  if (!entityId) return apiError('No linked entity found', 404);

  const fields: Record<string, string> = { name: suggestion.suggested_name };
  if (suggestion.description) fields.description = suggestion.description;

  // Generate only for the requested locales
  const { generateEntityTranslations } = await import('@/lib/ai');
  const { upsertTranslation } = await import('@/lib/queries/translations');
  const { sanitizeText } = await import('@/lib/sanitize');

  const translations = await generateEntityTranslations(fields, parsed.data.locales);

  let regeneratedCount = 0;
  for (const [locale, fieldMap] of Object.entries(translations)) {
    for (const [field, value] of Object.entries(fieldMap)) {
      if (value && typeof value === 'string') {
        await upsertTranslation(entityType, entityId, field, locale, sanitizeText(value), 'machine');
      }
    }
    regeneratedCount++;
  }

  return apiOk({ regeneratedCount, requestedCount: parsed.data.locales.length });
}
