import { NextRequest } from 'next/server';
import { getSuggestionById } from '@/lib/queries/suggestions';
import { getAllEntityTranslations, getLanguageNames } from '@/lib/queries/translations';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { apiOk, apiError } from '@/lib/api-response';
import { SUPPORTED_LOCALES } from '@/lib/ai';

/** GET /api/suggestions/[id]/translations — fetch all translations for review */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);

  const entityType = suggestion.suggested_type === 'issue' ? 'issue' : 'organisation';
  const entityId = suggestion.issue_id || suggestion.organisation_id;
  if (!entityId) return apiError('No linked entity found', 404);

  const translations = await getAllEntityTranslations(entityType, entityId);

  // Get language names for all locales that have translations
  const localeCodes = Object.keys(translations);
  const languageNames = await getLanguageNames(localeCodes.length > 0 ? localeCodes : [...SUPPORTED_LOCALES]);

  return apiOk({ translations, languageNames, entityType, entityId });
}
