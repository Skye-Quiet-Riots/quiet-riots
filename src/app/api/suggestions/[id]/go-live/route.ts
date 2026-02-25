import { NextRequest } from 'next/server';
import { getSuggestionById, goLiveSuggestion } from '@/lib/queries/suggestions';
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
  const { allowed } = rateLimit(`go-live:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);
  if (suggestion.status !== 'approved' && suggestion.status !== 'translations_ready') {
    return apiError('Suggestion must be approved before going live');
  }

  const result = await goLiveSuggestion(id);

  // Notify First Rioter
  sendNotification({
    recipientId: suggestion.suggested_by,
    type: 'suggestion_live',
    subject: `${suggestion.suggested_name} is now live!`,
    body: `Your Quiet Riot "${suggestion.suggested_name}" has had the 👍! It's now live. Share it with friends who care about this issue.`,
    entityType: 'issue_suggestion',
    entityId: id,
  }).catch(() => {});

  return apiOk({ suggestion: result });
}
