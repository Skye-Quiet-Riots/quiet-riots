import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getSuggestionById,
  approveSuggestion,
  rejectSuggestion,
  mergeSuggestion,
  requestMoreInfo,
} from '@/lib/queries/suggestions';
import { sendNotification } from '@/lib/queries/messages';
import { hasRole } from '@/lib/queries/roles';
import { joinIssue } from '@/lib/queries/users';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { getBotMessage } from '@/app/api/bot/bot-messages';
import type { Category, RejectionReason } from '@/types';

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'merge', 'more_info']),
  category: z.string().optional(),
  rejection_reason: z
    .enum(['close_to_existing', 'about_people', 'illegal_subject', 'other'])
    .optional(),
  rejection_detail: z.string().max(1000).optional(),
  close_match_ids: z.array(z.string()).optional(),
  merge_into_issue_id: z.string().optional(),
  merge_into_org_id: z.string().optional(),
  reviewer_notes: z.string().max(2000).optional(),
});

const REJECTION_KEY_MAP: Record<string, string> = {
  close_to_existing: 'rejectionCloseToExisting',
  about_people: 'rejectionAboutPeople',
  illegal_subject: 'rejectionIllegalSubject',
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`review:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const { decision } = parsed.data;
  const locale = suggestion.language_code || 'en';

  switch (decision) {
    case 'approve': {
      const cat = (parsed.data.category as Category) || (suggestion.category as Category);
      const result = await approveSuggestion(id, userId, cat, parsed.data.reviewer_notes);
      const whatsAppSummary = await getBotMessage(locale, 'suggestionApproved', {
        name: suggestion.suggested_name,
      });
      sendNotification({
        recipientId: suggestion.suggested_by,
        type: 'suggestion_approved',
        subject: `Thumbs Up 👍: ${suggestion.suggested_name}`,
        body: `Your Quiet Riot "${suggestion.suggested_name}" has been approved! We're preparing translations now — we'll let you know when it goes live.`,
        entityType: 'issue_suggestion',
        entityId: id,
        whatsAppSummary,
      }).catch(() => {});
      return apiOk({ suggestion: result, decision: 'approved' });
    }
    case 'reject': {
      const reason = parsed.data.rejection_reason as RejectionReason;
      if (!reason) return apiError('rejection_reason required for reject decision');
      const result = await rejectSuggestion(
        id,
        userId,
        reason,
        parsed.data.rejection_detail,
        parsed.data.close_match_ids,
      );
      const reasonLabels: Record<string, string> = {
        close_to_existing: 'too similar to an existing Quiet Riot',
        about_people: 'it targets people rather than issues',
        illegal_subject: 'it involves illegal activity',
        other: parsed.data.rejection_detail || 'see details',
      };
      const localReason =
        reason === 'other'
          ? parsed.data.rejection_detail || 'see details'
          : await getBotMessage(locale, REJECTION_KEY_MAP[reason]);
      const whatsAppSummary = await getBotMessage(locale, 'suggestionRejectedWithLink', {
        name: suggestion.suggested_name,
        reason: localReason,
      });
      sendNotification({
        recipientId: suggestion.suggested_by,
        type: 'suggestion_rejected',
        subject: `Update on ${suggestion.suggested_name}`,
        body: `Your suggestion "${suggestion.suggested_name}" wasn't approved because ${reasonLabels[reason] || reason}. Learn more: /info/rejection-reasons`,
        entityType: 'issue_suggestion',
        entityId: id,
        whatsAppSummary,
      }).catch(() => {});
      return apiOk({ suggestion: result, decision: 'rejected' });
    }
    case 'merge': {
      const mergeIssueId = parsed.data.merge_into_issue_id;
      const mergeOrgId = parsed.data.merge_into_org_id;
      if (!mergeIssueId && !mergeOrgId)
        return apiError('merge_into_issue_id or merge_into_org_id required');
      const result = await mergeSuggestion(id, userId, mergeIssueId, mergeOrgId);
      if (mergeIssueId) {
        await joinIssue(suggestion.suggested_by, mergeIssueId);
      }
      const mergeTargetPath = mergeIssueId
        ? `/issues/${mergeIssueId}`
        : mergeOrgId
          ? `/organisations/${mergeOrgId}`
          : '';
      const whatsAppSummary = await getBotMessage(locale, 'suggestionMerged', {
        name: suggestion.suggested_name,
        link: `https://www.quietriots.com${mergeTargetPath}`,
      });
      sendNotification({
        recipientId: suggestion.suggested_by,
        type: 'suggestion_merged',
        subject: `Your suggestion: ${suggestion.suggested_name}`,
        body: `Your suggestion is similar to an existing Quiet Riot. We've added you to that one so you can start taking action.`,
        entityType: 'issue_suggestion',
        entityId: id,
        whatsAppSummary,
      }).catch(() => {});
      return apiOk({ suggestion: result, decision: 'merged' });
    }
    case 'more_info': {
      const notes = parsed.data.reviewer_notes;
      if (!notes) return apiError('reviewer_notes required when requesting more info');
      const result = await requestMoreInfo(id, userId, notes);
      const whatsAppSummary = await getBotMessage(locale, 'suggestionMoreInfo', {
        name: suggestion.suggested_name,
        notes,
      });
      sendNotification({
        recipientId: suggestion.suggested_by,
        type: 'suggestion_more_info',
        subject: `Question about ${suggestion.suggested_name}`,
        body: `The Setup Guide has a question about your suggestion "${suggestion.suggested_name}": ${notes}`,
        entityType: 'issue_suggestion',
        entityId: id,
        whatsAppSummary,
      }).catch(() => {});
      return apiOk({ suggestion: result, decision: 'more_info' });
    }
  }
}
