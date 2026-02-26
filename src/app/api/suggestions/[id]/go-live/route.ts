import { NextRequest } from 'next/server';
import { getSuggestionById, goLiveSuggestion } from '@/lib/queries/suggestions';
import { sendNotification } from '@/lib/queries/messages';
import { hasRole, getUsersByRole } from '@/lib/queries/roles';
import { getUserById } from '@/lib/queries/users';
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
  if (suggestion.status !== 'translations_ready') {
    return apiError('Translations must be ready before going live');
  }

  const result = await goLiveSuggestion(id);

  // Get guide user for notification context
  const guideUser = await getUserById(userId);
  const guideName = guideUser?.display_name || guideUser?.name || 'Setup Guide';

  // Build entity link
  const entityPath =
    suggestion.suggested_type === 'issue' && suggestion.issue_id
      ? `/issues/${suggestion.issue_id}`
      : suggestion.organisation_id
        ? `/organisations/${suggestion.organisation_id}`
        : '';

  // 1. Notify First Rioter
  sendNotification({
    recipientId: suggestion.suggested_by,
    type: 'suggestion_live',
    subject: `${suggestion.suggested_name} is now live!`,
    body: `Your Quiet Riot "${suggestion.suggested_name}" has had the 👍! It's now live and translated into multiple languages. Share it with friends who care about this issue.`,
    entityType: 'issue_suggestion',
    entityId: id,
    whatsAppSummary: `Great news — your Quiet Riot "${suggestion.suggested_name}" has had the 👍! It's now live. Share it with friends who care about this issue: https://www.quietriots.com${entityPath}`,
  }).catch(() => {});

  // 2. Notify the Setup Guide who triggered go-live
  if (userId !== suggestion.suggested_by) {
    sendNotification({
      recipientId: userId,
      type: 'suggestion_live',
      subject: `${suggestion.suggested_name} is now live!`,
      body: `You made "${suggestion.suggested_name}" live. First Rioter has been notified.`,
      entityType: 'issue_suggestion',
      entityId: id,
    }).catch(() => {});
  }

  // 3. Notify all administrators
  const admins = await getUsersByRole('administrator');
  for (const admin of admins) {
    if (admin.user_id !== userId && admin.user_id !== suggestion.suggested_by) {
      sendNotification({
        recipientId: admin.user_id,
        type: 'suggestion_live',
        subject: `${suggestion.suggested_name} approved by ${guideName}`,
        body: `"${suggestion.suggested_name}" was approved by ${guideName} and is now live. First Rioter: ${suggestion.suggested_by}.`,
        entityType: 'issue_suggestion',
        entityId: id,
        whatsAppSummary: `"${suggestion.suggested_name}" approved by ${guideName} and is now live: https://www.quietriots.com${entityPath}`,
      }).catch(() => {});
    }
  }

  return apiOk({ suggestion: result });
}
