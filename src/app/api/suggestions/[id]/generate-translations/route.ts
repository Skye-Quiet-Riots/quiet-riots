import { NextRequest } from 'next/server';
import { getSuggestionById, markTranslationsReady } from '@/lib/queries/suggestions';
import { generateAndStoreTranslations } from '@/lib/queries/generate-translations';
import { sendNotification } from '@/lib/queries/messages';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`gen-translations:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);
  if (suggestion.status !== 'approved') {
    return apiError('Suggestion must be approved before generating translations');
  }

  // Determine entity type and ID
  const entityType = suggestion.suggested_type === 'issue' ? 'issue' : 'organisation';
  const entityId = suggestion.issue_id || suggestion.organisation_id;
  if (!entityId) return apiError('No linked entity found', 404);

  // Build fields to translate
  const fields: Record<string, string> = { name: suggestion.suggested_name };
  if (suggestion.description) fields.description = suggestion.description;

  const result = await generateAndStoreTranslations(entityType, entityId, fields);

  if (result.success) {
    // Transition to translations_ready
    const updated = await markTranslationsReady(id);

    // Notify the reviewer that translations are ready for review
    sendNotification({
      recipientId: userId,
      type: 'suggestion_progress',
      subject: `Translations ready: ${suggestion.suggested_name}`,
      body: `Translations for "${suggestion.suggested_name}" have been generated for ${result.localeCount} languages. Review them and go live when ready.`,
      entityType: 'issue_suggestion',
      entityId: id,
      whatsAppSummary: `Translations for "${suggestion.suggested_name}" are ready (${result.localeCount} languages). Review and go live in the dashboard.`,
    }).catch(() => {});

    return apiOk({ suggestion: updated, localeCount: result.localeCount });
  }

  return apiError('Translation generation failed — check ANTHROPIC_API_KEY is configured', 500);
}
