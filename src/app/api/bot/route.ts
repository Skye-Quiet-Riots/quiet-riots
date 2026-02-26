import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllIssues, getIssueById, getTrendingIssues, createIssue } from '@/lib/queries/issues';
import {
  getAllOrganisations,
  getOrganisationById,
  getOrgsForIssue,
  getIssuesForOrg,
  getTotalRiotersForOrg,
  createOrganisation,
} from '@/lib/queries/organisations';
import { getFilteredActions, getActionCountForIssue } from '@/lib/queries/actions';
import {
  getCommunityHealth,
  getExpertProfiles,
  getFeedPosts,
  createFeedPost,
  getCountryBreakdown,
} from '@/lib/queries/community';
import {
  getUserByPhone,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  joinIssue,
  leaveIssue,
  getUserIssues,
} from '@/lib/queries/users';
import { getSynonymsForIssue, addSynonym } from '@/lib/queries/synonyms';
import { getSeasonalPattern } from '@/lib/queries/seasonal-patterns';
import { getRelatedIssues } from '@/lib/queries/issue-relations';
import {
  getUnseenReelForUser,
  logReelShown,
  incrementReelViews,
  createReel,
} from '@/lib/queries/reels';
import { extractVideoId, getThumbnailUrl, getVideoMetadata } from '@/lib/youtube';
import {
  getWalletByUserId,
  getOrCreateWallet,
  createTopupTransaction,
  completeTopup,
  createPayment,
  getUserSpendingSummary,
} from '@/lib/queries/wallet';
import { getActionInitiatives } from '@/lib/queries/action-initiatives';
import {
  getAssistantByCategory,
  getAssistantDetail,
  getUserMetAssistants,
  recordAssistantIntroduction,
  createSuggestion,
} from '@/lib/queries/assistants';
import { createEvidence, getEvidenceForIssue } from '@/lib/queries/evidence';
import {
  translateEntities,
  translateEntity,
  translateActionInitiatives,
  translateIssuePivotRows,
  translateOrgPivotRows,
  translateSynonyms,
} from '@/lib/queries/translate';
import { getUserMemories, saveMemory, deleteMemory } from '@/lib/queries/memory';
import {
  createSuggestion as createIssueSuggestion,
  getSuggestionsByUser,
  getSuggestionsByStatus,
  getSuggestionById,
  approveSuggestion,
  rejectSuggestion,
  mergeSuggestion,
  requestMoreInfo as requestSuggestionMoreInfo,
  goLiveSuggestion,
  getCloseMatches,
  setPublicRecognition,
} from '@/lib/queries/suggestions';
import { hasRole, getUsersByRole } from '@/lib/queries/roles';
import {
  createMessage,
  getMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUndeliveredMessages,
  markMessageDelivered,
} from '@/lib/queries/messages';
import { sendEmail } from '@/lib/email';
import { getUndeliveredCodes, markCodeDelivered } from '@/lib/queries/phone-verification';
import {
  checkShareEligibility,
  getOrCreateShareApplication,
  getShareApplication,
  promoteToEligible,
  proceedWithShare,
  declineShare,
  withdrawShare,
  reapplyForShare,
  createShareMessage,
} from '@/lib/queries/shares';
import type { MemoryCategory, Category, SuggestedType, RejectionReason } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';
import { trackBotEvent } from '@/lib/queries/bot-events';
import { sanitizeText } from '@/lib/sanitize';
import { translateToEnglish } from '@/lib/ai';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/uuid';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_DEV_KEY = !process.env.BOT_API_KEY || process.env.BOT_API_KEY === DEV_FALLBACK_KEY;

// ─── Zod Schemas ──────────────────────────────────────────
const phoneField = z
  .string()
  .min(1)
  .max(20)
  .refine((s) => /^\+[1-9]\d{6,14}$/.test(s.trim()), { message: 'Invalid E.164 phone number' })
  .transform((s) => s.trim());
const idField = z.string().min(1).max(64);
const langField = z.string().min(2).max(10).optional();
const countryField = z.string().min(2).max(3).optional();
const phoneParam = z.object({
  phone: phoneField,
  name: z.string().max(255).optional(),
  language_code: langField,
});
const issueIdParam = z.object({ issue_id: idField });
const phoneAndIssue = z.object({ phone: phoneField, issue_id: idField });
const queryParam = z.object({ query: z.string().min(1).max(500) });

const actionSchemas = {
  identify: phoneParam,
  search_issues: queryParam.extend({ language_code: langField }),
  get_trending: z.object({
    limit: z.number().int().positive().optional(),
    language_code: langField,
  }),
  get_issue: issueIdParam.extend({ language_code: langField }),
  get_actions: issueIdParam.extend({
    type: z.string().max(50).optional(),
    time: z.string().max(50).optional(),
    skills: z.string().max(200).optional(),
    language_code: langField,
  }),
  get_community: issueIdParam.extend({ language_code: langField }),
  join_issue: phoneAndIssue,
  leave_issue: phoneAndIssue,
  post_feed: phoneAndIssue.extend({
    content: z
      .string()
      .min(1)
      .max(5000)
      .transform((s) => sanitizeText(s)),
  }),
  get_org_pivot: z.object({ org_id: idField, language_code: langField }),
  get_orgs: z.object({ category: z.string().max(50).optional(), language_code: langField }),
  add_synonym: z.object({
    issue_id: idField,
    term: z
      .string()
      .min(1)
      .max(255)
      .transform((s) => sanitizeText(s)),
  }),
  update_user: z.object({
    phone: phoneField,
    name: z
      .string()
      .max(255)
      .transform((s) => sanitizeText(s))
      .optional(),
    time_available: z.enum(['1min', '10min', '1hr+']).optional(),
    skills: z
      .string()
      .max(500)
      .transform((s) => sanitizeText(s))
      .optional(),
    language_code: langField,
    country_code: countryField,
  }),
  create_issue: z.object({
    phone: phoneField,
    name: z
      .string()
      .min(1, 'Issue name required')
      .max(255)
      .transform((s) => sanitizeText(s)),
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
      .max(5000)
      .transform((s) => sanitizeText(s))
      .optional()
      .default(''),
  }),
  get_riot_reel: phoneAndIssue,
  submit_riot_reel: z.object({
    phone: phoneField,
    issue_id: idField,
    youtube_url: z.string().min(1).max(500),
    caption: z
      .string()
      .max(1000)
      .transform((s) => sanitizeText(s))
      .optional()
      .default(''),
  }),
  get_wallet: phoneParam,
  topup_wallet: z.object({
    phone: phoneField,
    amount_pence: z.number().int().min(100, 'Minimum top-up is £1').max(1000000),
  }),
  contribute: z.object({
    phone: phoneField,
    campaign_id: idField,
    amount_pence: z.number().int().min(10, 'Minimum payment is 10p').max(1000000),
  }),
  get_campaigns: z.object({
    issue_id: idField.optional(),
    status: z.enum(['active', 'goal_reached', 'delivered', 'cancelled']).optional(),
    language_code: langField,
  }),
  get_category_assistants: z.object({
    category: z.string().min(1, 'Category required').max(50),
  }),
  get_assistant_detail: z.object({
    category: z.string().min(1, 'Category required').max(50),
  }),
  check_user_met_assistants: phoneParam,
  record_assistant_introduction: z.object({
    phone: phoneField,
    category: z.string().min(1, 'Category required').max(50),
  }),
  log_suggestion: z.object({
    phone: phoneField,
    issue_id: idField,
    suggestion_text: z
      .string()
      .min(1, 'Suggestion text required')
      .max(2000)
      .transform((s) => sanitizeText(s)),
  }),
  submit_evidence: z.object({
    phone: phoneField,
    issue_id: idField,
    content: z
      .string()
      .min(1)
      .max(5000)
      .transform((s) => sanitizeText(s)),
    org_id: idField.optional(),
    photo_url: z.string().url().max(2000).optional(),
    video_url: z.string().url().max(2000).optional(),
    live: z.boolean().optional().default(false),
  }),
  get_evidence: z.object({
    issue_id: idField,
    org_id: idField.optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
  go_live: z.object({
    phone: phoneField,
    issue_id: idField,
    content: z
      .string()
      .min(1)
      .max(5000)
      .transform((s) => sanitizeText(s)),
    org_id: idField.optional(),
  }),
  set_language: z.object({
    phone: phoneField,
    language_code: z.string().min(2).max(10),
  }),
  set_country: z.object({
    phone: phoneField,
    country_code: z.string().min(2).max(3),
  }),
  save_memory: z.object({
    phone: phoneField,
    key: z
      .string()
      .min(1)
      .max(100)
      .transform((s) => sanitizeText(s)),
    value: z
      .string()
      .min(1)
      .max(500)
      .transform((s) => sanitizeText(s)),
    category: z
      .enum(['preference', 'context', 'goal', 'emotional', 'general'])
      .optional()
      .default('general'),
  }),
  get_memories: z.object({ phone: phoneField }),
  delete_memory: z.object({
    phone: phoneField,
    key: z.string().min(1).max(100),
  }),

  // ─── Suggestion Pipeline ───────────────────────────────
  suggest_riot: z.object({
    phone: phoneField,
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
    language_code: langField,
  }),
  get_suggestion_status: z.object({
    phone: phoneField,
    language_code: langField,
  }),
  respond_more_info: z.object({
    phone: phoneField,
    suggestion_id: idField,
    response: z
      .string()
      .min(1, 'Response required')
      .max(2000)
      .transform((s) => sanitizeText(s)),
  }),
  review_suggestion: z.object({
    phone: phoneField,
    suggestion_id: idField,
    decision: z.enum(['approve', 'reject', 'merge', 'more_info']),
    category: z
      .enum([
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
      ])
      .optional(),
    rejection_reason: z
      .enum(['close_to_existing', 'about_people', 'illegal_subject', 'other'])
      .optional(),
    rejection_detail: z.string().max(1000).optional(),
    close_match_ids: z.string().max(2000).optional(),
    merge_into_issue_id: idField.optional(),
    merge_into_org_id: idField.optional(),
    reviewer_notes: z.string().max(2000).optional(),
  }),
  go_live_suggestion: z.object({
    phone: phoneField,
    suggestion_id: idField,
  }),
  get_inbox: z.object({
    phone: phoneField,
    unread_only: z.boolean().optional().default(false),
    limit: z.number().int().positive().max(50).optional(),
  }),
  mark_message_read: z.object({
    phone: phoneField,
    message_id: idField,
  }),
  mark_all_read: z.object({
    phone: phoneField,
  }),

  // ─── Admin/Setup Actions ────────────────────────────────
  get_pending_suggestions: z.object({
    phone: phoneField,
    limit: z.number().int().positive().max(50).optional(),
  }),
  set_first_rioter_preference: z.object({
    phone: phoneField,
    suggestion_id: idField,
    public_recognition: z.boolean(),
  }),

  // ─── Email Linking ────────────────────────────────────
  link_email: z.object({
    phone: phoneField,
    email: z.string().email('Invalid email address').max(255),
  }),
  verify_email_status: z.object({
    phone: phoneField,
  }),

  // ─── Share Scheme ───────────────────────────────────────
  get_share_status: z.object({ phone: phoneField }),
  get_share_eligibility: z.object({ phone: phoneField }),
  apply_for_share: z.object({ phone: phoneField }),
  decline_share: z.object({ phone: phoneField }),
  withdraw_share: z.object({ phone: phoneField }),
  reapply_share: z.object({ phone: phoneField }),
  ask_share_question: z.object({
    phone: phoneField,
    message: z
      .string()
      .min(1, 'Message required')
      .max(5000)
      .transform((s) => sanitizeText(s)),
  }),

  // ─── OTP Delivery (for local polling script) ───────────
  get_undelivered_codes: z.object({}),
  mark_code_delivered: z.object({ code_id: idField }),

  // ─── Message Delivery (for local polling script) ──────
  get_undelivered_messages: z.object({}),
  mark_message_delivered: z.object({ message_id: idField }),
} as const;

type ActionName = keyof typeof actionSchemas;

const bodySchema = z.object({
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Helpers ──────────────────────────────────────────────
function verifyAuth(request: NextRequest): boolean {
  if (IS_DEV_KEY && process.env.NODE_ENV === 'production') {
    return false; // Reject dev fallback key in production — require a proper secret
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${BOT_API_KEY}`;
}

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

function err(message: string, status = 400) {
  const code =
    status === 404
      ? 'NOT_FOUND'
      : status === 401
        ? 'UNAUTHORIZED'
        : status === 429
          ? 'RATE_LIMITED'
          : status >= 500
            ? 'INTERNAL_ERROR'
            : 'VALIDATION_ERROR';
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

function parseParams<T extends ActionName>(action: T, params: Record<string, unknown>) {
  const schema = actionSchemas[action];
  return schema.safeParse(params);
}

// ─── Notification Helpers ──────────────────────────────────

/** Compute WhatsApp delivery expiry (4 hours from now) */
function whatsappExpiresAt(): string {
  const expires = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return expires.toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Notify all Setup Guides about a new suggestion.
 * Queues WhatsApp for polling script + sends email + creates inbox message.
 * Fire-and-forget — never throws.
 */
async function notifySetupGuides(
  suggestedName: string,
  category: string,
  suggestedByName: string,
  suggestionId: string,
): Promise<void> {
  try {
    const guideRoles = await getUsersByRole('setup_guide');
    const adminRoles = await getUsersByRole('administrator');
    const allRoleRows = [...guideRoles, ...adminRoles];
    // Deduplicate by user_id
    const uniqueUserIds = [...new Set(allRoleRows.map((r) => r.user_id))];

    const waMessage = `New Quiet Riot suggestion from ${suggestedByName}: "${suggestedName}" in ${category}. Please review it.`;
    const expiresAt = whatsappExpiresAt();

    for (const userId of uniqueUserIds) {
      // Look up user for phone/email
      const guideUser = await getUserById(userId);

      // Inbox message + WhatsApp queue (if user has phone)
      await createMessage({
        recipientId: userId,
        senderName: suggestedByName,
        type: 'suggestion_received',
        subject: `New suggestion: ${suggestedName}`,
        body: `A new Quiet Riot suggestion "${suggestedName}" in ${category} has been submitted by ${suggestedByName}. Please review it on the Setup page.`,
        entityType: 'issue_suggestion',
        entityId: suggestionId,
        whatsappMessage: guideUser?.phone ? waMessage : undefined,
        whatsappExpiresAt: guideUser?.phone ? expiresAt : undefined,
      });

      // Email (only if real email)
      if (guideUser?.email && !guideUser.email.startsWith('wa-')) {
        await sendEmail(
          guideUser.email,
          `New suggestion: ${suggestedName}`,
          `<p>A new Quiet Riot suggestion <strong>${suggestedName}</strong> in ${category} has been submitted by ${suggestedByName}.</p><p>Please review it on the Setup page.</p>`,
        );
      }
    }
  } catch (error) {
    console.error('Failed to notify Setup Guides:', error);
  }
}

/**
 * Send notification to a specific user via all channels.
 * Queues WhatsApp for polling script + sends email + creates inbox message.
 * Fire-and-forget — never throws.
 */
async function notifyUser(
  userId: string,
  type: import('@/types').MessageType,
  subject: string,
  body: string,
  entityType?: import('@/types').MessageEntityType,
  entityId?: string,
  senderName?: string,
): Promise<void> {
  try {
    const user = await getUserById(userId);

    await createMessage({
      recipientId: userId,
      senderName,
      type,
      subject,
      body,
      entityType,
      entityId,
      whatsappMessage: user?.phone ? `${subject}: ${body.slice(0, 500)}` : undefined,
      whatsappExpiresAt: user?.phone ? whatsappExpiresAt() : undefined,
    });

    if (user?.email && !user.email.startsWith('wa-')) {
      await sendEmail(user.email, subject, `<p>${body.replace(/\n/g, '</p><p>')}</p>`);
    }
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
}

/**
 * Notify all Share Guides about a new share application.
 * Queues WhatsApp for polling script + sends email + creates inbox message.
 * Fire-and-forget — never throws.
 */
async function notifyShareGuides(applicantName: string, applicantUserId: string): Promise<void> {
  try {
    const guideRoles = await getUsersByRole('share_guide');
    const adminRoles = await getUsersByRole('administrator');
    const allRoleRows = [...guideRoles, ...adminRoles];
    const uniqueUserIds = [...new Set(allRoleRows.map((r) => r.user_id))];

    const waMessage = `New share application from ${applicantName}. Please review it on the Share Guide dashboard.`;
    const expiresAt = whatsappExpiresAt();

    for (const userId of uniqueUserIds) {
      const guideUser = await getUserById(userId);

      await createMessage({
        recipientId: userId,
        senderName: applicantName,
        type: 'share_payment_received',
        subject: `New share application from ${applicantName}`,
        body: `${applicantName} has applied for their Quiet Riots share. Please review their application on the Share Guide dashboard.`,
        entityType: 'share_application',
        entityId: applicantUserId,
        whatsappMessage: guideUser?.phone ? waMessage : undefined,
        whatsappExpiresAt: guideUser?.phone ? expiresAt : undefined,
      });

      if (guideUser?.email && !guideUser.email.startsWith('wa-')) {
        await sendEmail(
          guideUser.email,
          `New share application: ${applicantName}`,
          `<p><strong>${applicantName}</strong> has applied for their Quiet Riots share.</p><p>Please review their application on the Share Guide dashboard.</p>`,
        );
      }
    }
  } catch (error) {
    console.error('Failed to notify share guides:', error);
  }
}

/**
 * Notify Share Guides about a user question on their share application.
 * Queues WhatsApp for polling script + creates inbox message.
 * Fire-and-forget — never throws.
 */
async function notifyShareGuidesQuestion(
  userName: string,
  question: string,
  applicationId: string,
): Promise<void> {
  try {
    const guideRoles = await getUsersByRole('share_guide');
    const adminRoles = await getUsersByRole('administrator');
    const allRoleRows = [...guideRoles, ...adminRoles];
    const uniqueUserIds = [...new Set(allRoleRows.map((r) => r.user_id))];

    const waMessage = `Share question from ${userName}: ${question.slice(0, 200)}`;
    const expiresAt = whatsappExpiresAt();

    for (const userId of uniqueUserIds) {
      const guideUser = await getUserById(userId);

      await createMessage({
        recipientId: userId,
        senderName: userName,
        type: 'share_question',
        subject: `Share question from ${userName}`,
        body: `${userName} asked: ${question.slice(0, 500)}`,
        entityType: 'share_application',
        entityId: applicationId,
        whatsappMessage: guideUser?.phone ? waMessage : undefined,
        whatsappExpiresAt: guideUser?.phone ? expiresAt : undefined,
      });
    }
  } catch (error) {
    console.error('Failed to notify share guides about question:', error);
  }
}

// ─── Route Handler ────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return err('Unauthorized', 401);
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfterMs } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const log = createRequestLogger({
    requestId: crypto.randomUUID(),
    ip,
  });

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return err('Invalid request body: ' + parsed.error.issues[0].message);
    body = parsed.data;
  } catch {
    return err('Invalid JSON body');
  }

  const { action, params } = body;
  const startTime = Date.now();
  log.info({ action }, 'Bot request received');

  if (!(action in actionSchemas)) {
    log.warn({ action }, 'Unknown bot action');
    return err(`Unknown action: ${action}`);
  }

  const result = parseParams(action as ActionName, params);
  if (!result.success) {
    log.warn({ action, issues: result.error.issues }, 'Bot validation failed');
    return err(
      result.error.issues
        .map((i) => {
          const path = i.path.length ? i.path.join('.') + ': ' : '';
          return path + i.message;
        })
        .join(', '),
    );
  }

  const p = result.data as Record<string, unknown>;

  // Analytics: track userId and issueId as they're resolved during dispatch
  let trackedUserId: string | null = null;
  const trackedIssueId: string | null = (p.issue_id as string) ?? null;
  const trackedOrgId: string | null = (p.org_id as string) ?? null;
  let trackedAssistantCategory: string | null = (p.category as string) ?? null;
  let trackedStatus: 'ok' | 'error' = 'ok';
  let trackedError: string | null = null;

  // Helper: resolve user by phone and track the user ID for analytics
  async function resolveUser(phone: string) {
    const user = await getUserByPhone(phone);
    if (user) trackedUserId = user.id;
    return user;
  }

  try {
    switch (action) {
      // ─── User Identity ───────────────────────────────────
      case 'identify': {
        const phone = p.phone as string;
        let user = await getUserByPhone(phone);
        if (user) trackedUserId = user.id;
        if (!user) {
          const digits = phone.replace(/\D/g, '');
          const email = `wa-${digits}@whatsapp.quietriots.com`;
          const name = (p.name as string) || 'WhatsApp User';
          const languageCode = (p.language_code as string) || undefined;
          user = await createUser({ name, email, phone, language_code: languageCode });
          trackedUserId = user.id;
        }
        const locale = user.language_code || 'en';
        const [issues, memories] = await Promise.all([
          getUserIssues(user.id),
          getUserMemories(user.id),
        ]);
        const translatedIssues = await translateOrgPivotRows(
          issues as unknown as { issue_id: string; issue_name: string }[],
          locale,
        );
        return ok({
          user,
          issues: translatedIssues,
          memories,
          language_code: user.language_code,
        });
      }

      // ─── Issue Discovery ─────────────────────────────────
      case 'search_issues': {
        const locale = (p.language_code as string) || 'en';
        let issues = await getAllIssues(undefined, p.query as string, undefined, locale);
        issues = await translateEntities(issues, 'issue', locale);
        return ok({ issues });
      }

      case 'get_trending': {
        const locale = (p.language_code as string) || 'en';
        const limit = (p.limit as number) || 6;
        let issues = await getTrendingIssues(limit);
        issues = await translateEntities(issues, 'issue', locale);
        return ok({ issues });
      }

      case 'get_issue': {
        const issueId = p.issue_id as string;
        const locale = (p.language_code as string) || 'en';
        const rawIssue = await getIssueById(issueId);
        if (!rawIssue) return err('Issue not found', 404);

        const [
          health,
          countries,
          rawPivotOrgs,
          actionCount,
          synonyms,
          seasonalPattern,
          rawRelatedIssues,
        ] = await Promise.all([
          getCommunityHealth(rawIssue.id),
          getCountryBreakdown(rawIssue.id),
          getOrgsForIssue(rawIssue.id),
          getActionCountForIssue(rawIssue.id),
          getSynonymsForIssue(rawIssue.id),
          getSeasonalPattern(rawIssue.id),
          getRelatedIssues(rawIssue.id),
        ]);
        const [issue, pivotOrgs, relatedIssues, translatedSynonyms] = await Promise.all([
          translateEntity(rawIssue, 'issue', locale),
          translateIssuePivotRows(rawPivotOrgs, locale),
          translateOrgPivotRows(rawRelatedIssues, locale),
          translateSynonyms(synonyms, locale),
        ]);
        return ok({
          issue,
          health,
          countries,
          pivotOrgs,
          actionCount,
          synonyms: translatedSynonyms,
          seasonalPattern,
          relatedIssues,
        });
      }

      // ─── Actions ─────────────────────────────────────────
      case 'get_actions': {
        const issueId = p.issue_id as string;
        // Note: actions are not translated in DB yet — language_code accepted but unused
        const actions = await getFilteredActions(issueId, {
          type: p.type as string | undefined,
          time: p.time as string | undefined,
          skills: p.skills as string | undefined,
        });
        return ok({ actions });
      }

      // ─── Community ───────────────────────────────────────
      case 'get_community': {
        const issueId = p.issue_id as string;
        // Note: community data (health, feed, experts, countries) is not translated — language_code accepted for future use
        const [health, feed, experts, countries] = await Promise.all([
          getCommunityHealth(issueId),
          getFeedPosts(issueId, 5),
          getExpertProfiles(issueId),
          getCountryBreakdown(issueId),
        ]);
        return ok({ health, feed, experts, countries });
      }

      // ─── Join / Leave Issue ──────────────────────────────
      case 'join_issue': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        await joinIssue(user.id, issueId);
        return ok({ joined: true, user_id: user.id, issue_id: issueId });
      }

      case 'leave_issue': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found', 404);

        await leaveIssue(user.id, issueId);
        return ok({ left: true, user_id: user.id, issue_id: issueId });
      }

      // ─── Feed ────────────────────────────────────────────
      case 'post_feed': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const content = p.content as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const post = await createFeedPost(issueId, user.id, content);
        return ok({ post });
      }

      // ─── Organisation Pivot ──────────────────────────────
      case 'get_org_pivot': {
        const orgId = p.org_id as string;
        const locale = (p.language_code as string) || 'en';
        const rawOrg = await getOrganisationById(orgId);
        if (!rawOrg) return err('Organisation not found', 404);

        const [rawIssues, totalRioters] = await Promise.all([
          getIssuesForOrg(rawOrg.id),
          getTotalRiotersForOrg(rawOrg.id),
        ]);
        const [org, issues] = await Promise.all([
          translateEntity(rawOrg, 'organisation', locale),
          translateOrgPivotRows(rawIssues, locale),
        ]);
        return ok({ org, issues, totalRioters });
      }

      case 'get_orgs': {
        const category = p.category as string | undefined;
        const locale = (p.language_code as string) || 'en';
        let orgs = await getAllOrganisations(category as never);
        orgs = await translateEntities(orgs, 'organisation', locale);
        return ok({ orgs });
      }

      // ─── Synonyms ────────────────────────────────────────
      case 'add_synonym': {
        const issueId = p.issue_id as string;
        const term = p.term as string;
        const synonym = await addSynonym(issueId, term);
        return ok({ synonym });
      }

      // ─── Create Issue (routes through suggestion pipeline) ───
      case 'create_issue': {
        const phone = p.phone as string;
        const name = p.name as string;
        const category = p.category as Category;
        const description = (p.description as string) || '';
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        // Translate to English if user's language is not English
        const userLang = user.language_code || 'en';
        const englishName =
          userLang !== 'en' ? await translateToEnglish(name, userLang) : name;
        const englishDescription =
          userLang !== 'en' && description
            ? await translateToEnglish(description, userLang)
            : description;

        // Create pending issue
        const issue = await createIssue({
          name: englishName,
          category,
          description: englishDescription,
          status: 'pending_review',
          first_rioter_id: user.id,
        });

        // Auto-join user to the pending issue
        await joinIssue(user.id, issue.id);

        // Create suggestion record
        const closeMatches = await getCloseMatches(englishName, category, 'issue');
        const suggestion = await createIssueSuggestion({
          suggestedBy: user.id,
          originalText: name,
          suggestedName: englishName,
          suggestedType: 'issue',
          category,
          description: englishDescription,
          issueId: issue.id,
          closeMatchIds: closeMatches.map((m) => m.id),
          publicRecognition: 1,
          languageCode: userLang,
        });

        // Notify Setup Guides (fire-and-forget)
        notifySetupGuides(englishName, category, user.name ?? 'Anonymous', suggestion.id).catch(
          () => {},
        );

        return ok({ issue, suggestion, close_matches: closeMatches });
      }

      // ─── User Profile ────────────────────────────────────
      case 'update_user': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const updated = await updateUser(user.id, {
          name: p.name as string | undefined,
          time_available: p.time_available as string | undefined,
          skills: p.skills as string | undefined,
          language_code: p.language_code as string | undefined,
          country_code: p.country_code as string | undefined,
        });
        return ok({ user: updated });
      }

      // ─── Riot Reels ──────────────────────────────────────
      case 'get_riot_reel': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const reel = await getUnseenReelForUser(issueId, user.id);
        if (!reel) {
          return ok({ reel: null, message: 'No more unseen reels for this issue' });
        }

        await logReelShown(user.id, reel.id, issueId);
        await incrementReelViews(reel.id);
        return ok({ reel });
      }

      case 'submit_riot_reel': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const youtubeUrl = p.youtube_url as string;
        const caption = (p.caption as string) || '';
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) return err('Invalid YouTube URL');

        const metadata = await getVideoMetadata(videoId);
        const reel = await createReel({
          issueId,
          youtubeUrl,
          youtubeVideoId: videoId,
          title: metadata?.title ?? '',
          thumbnailUrl: metadata?.thumbnail_url ?? getThumbnailUrl(videoId),
          durationSeconds: null,
          caption,
          submittedBy: user.id,
          source: 'community',
          status: 'pending',
        });
        return ok({ reel });
      }

      // ─── Riot Wallet ──────────────────────────────────────
      case 'get_wallet': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const wallet = await getOrCreateWallet(user.id);
        const summary = await getUserSpendingSummary(user.id);
        return ok({ wallet, summary });
      }

      case 'topup_wallet': {
        const phone = p.phone as string;
        const amountPence = p.amount_pence as number;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const wallet = await getOrCreateWallet(user.id);
        const { transaction } = await createTopupTransaction(wallet.id, amountPence);
        // Simulated: instantly credit the wallet (no Stripe checkout needed)
        await completeTopup(transaction.id, 'simulated');
        const updatedWallet = await getWalletByUserId(user.id);
        return ok({ transaction, wallet: updatedWallet });
      }

      case 'contribute': {
        // Keep bot action name 'contribute' for SKILL.md compatibility
        const phone = p.phone as string;
        const actionInitiativeId = p.campaign_id as string;
        const amountPence = p.amount_pence as number;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        try {
          const result = await createPayment(user.id, actionInitiativeId, amountPence);
          const wallet = await getOrCreateWallet(user.id);
          return ok({
            transaction: result.transaction,
            campaign: result.actionInitiative,
            wallet_balance_pence: wallet.balance_pence,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Payment failed';
          if (message === 'Insufficient funds') return err(message);
          if (message === 'Action initiative not found') return err(message, 404);
          if (message === 'Action initiative is not active') return err(message);
          if (message === 'Wallet not found') return err(message, 404);
          throw e;
        }
      }

      case 'get_campaigns': {
        // Keep bot action name 'get_campaigns' for SKILL.md compatibility
        const issueId = p.issue_id as string | undefined;
        const status = p.status as import('@/types').ActionInitiativeStatus | undefined;
        const locale = (p.language_code as string) || 'en';
        let actionInitiatives = await getActionInitiatives(issueId, status);
        actionInitiatives = await translateActionInitiatives(actionInitiatives, locale);
        return ok({ campaigns: actionInitiatives });
      }

      // ─── Category Assistants ────────────────────────────────
      case 'get_category_assistants': {
        const category = (p.category as string).toLowerCase();
        const assistant = await getAssistantByCategory(category);
        if (!assistant) return err('Assistant pair not found', 404);
        return ok({ assistant });
      }

      case 'get_assistant_detail': {
        const category = (p.category as string).toLowerCase();
        trackedAssistantCategory = category;
        const detail = await getAssistantDetail(category);
        if (!detail) return err('Assistant pair not found', 404);
        return ok({ assistant: detail });
      }

      case 'check_user_met_assistants': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const met = await getUserMetAssistants(user.id);
        return ok({ met });
      }

      case 'record_assistant_introduction': {
        const phone = p.phone as string;
        const category = (p.category as string).toLowerCase();
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const assistant = await getAssistantByCategory(category);
        if (!assistant) return err('Assistant pair not found', 404);

        const intro = await recordAssistantIntroduction(user.id, category);
        return ok({ introduction: intro, assistant });
      }

      case 'log_suggestion': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const suggestionText = p.suggestion_text as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        try {
          const result = await createSuggestion(user.id, issueId, suggestionText);
          return ok(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Suggestion failed';
          if (message === 'Issue not found') return err(message, 404);
          if (message === 'No assistants found for category') return err(message, 404);
          throw e;
        }
      }

      // ─── Evidence ────────────────────────────────────────
      case 'submit_evidence': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const photoUrl = p.photo_url as string | undefined;
        const videoUrl = p.video_url as string | undefined;

        // Determine mediaType from provided URLs (video takes precedence)
        let mediaType: 'text' | 'photo' | 'video' = 'text';
        if (videoUrl) mediaType = 'video';
        else if (photoUrl) mediaType = 'photo';

        const evidence = await createEvidence({
          issueId,
          orgId: (p.org_id as string) ?? null,
          userId: user.id,
          content: p.content as string,
          mediaType,
          photoUrls: photoUrl ? [photoUrl] : [],
          videoUrl: videoUrl ?? null,
          live: (p.live as boolean) ?? false,
        });
        return ok({ evidence });
      }

      case 'get_evidence': {
        const issueId = p.issue_id as string;
        const orgId = p.org_id as string | undefined;
        const limit = (p.limit as number) || 10;
        const evidence = await getEvidenceForIssue(issueId, orgId, limit);
        return ok({ evidence });
      }

      case 'go_live': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const evidence = await createEvidence({
          issueId,
          orgId: (p.org_id as string) ?? null,
          userId: user.id,
          content: p.content as string,
          mediaType: 'live_stream',
          live: true,
        });
        return ok({ evidence, message: 'You are live! Be passionate but respectful.' });
      }

      // ─── Language / Country ─────────────────────────────
      case 'set_language': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const updated = await updateUser(user.id, {
          language_code: p.language_code as string,
        });
        return ok({ user: updated, language_code: updated?.language_code });
      }

      case 'set_country': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const updated = await updateUser(user.id, {
          country_code: p.country_code as string,
        });
        return ok({ user: updated, country_code: updated?.country_code });
      }

      // ─── User Memory ──────────────────────────────────────
      case 'save_memory': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const memory = await saveMemory(
          user.id,
          p.key as string,
          p.value as string,
          p.category as MemoryCategory,
        );
        return ok({ memory });
      }

      case 'get_memories': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const memories = await getUserMemories(user.id);
        return ok({ memories });
      }

      case 'delete_memory': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        const deleted = await deleteMemory(user.id, p.key as string);
        return ok({ deleted });
      }

      // ─── Suggestion Pipeline ─────────────────────────────
      case 'suggest_riot': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const suggestedName = p.suggested_name as string;
        const suggestedType = p.suggested_type as SuggestedType;
        const category = p.category as Category;
        const description = (p.description as string) || '';
        const publicRecognition = p.public_recognition as boolean;

        // Translate to English if user's language is not English
        const userLang = user.language_code || 'en';
        const englishName =
          userLang !== 'en' ? await translateToEnglish(suggestedName, userLang) : suggestedName;
        const englishDescription =
          userLang !== 'en' && description
            ? await translateToEnglish(description, userLang)
            : description;

        // Find close matches (using English name for better matching)
        const closeMatches = await getCloseMatches(englishName, category, suggestedType);

        // Create the pending entity
        let entityId: string;
        if (suggestedType === 'issue') {
          const issue = await createIssue({
            name: englishName,
            category,
            description: englishDescription,
            status: 'pending_review',
            first_rioter_id: user.id,
          });
          entityId = issue.id;
          // Auto-join user to the pending issue
          await joinIssue(user.id, issue.id);
        } else {
          const org = await createOrganisation({
            name: englishName,
            category,
            description: englishDescription,
            status: 'pending_review',
            first_rioter_id: user.id,
          });
          entityId = org.id;
        }

        // Create suggestion record
        const suggestion = await createIssueSuggestion({
          suggestedBy: user.id,
          originalText: p.original_text as string,
          suggestedName: englishName,
          suggestedType,
          category,
          description: englishDescription,
          issueId: suggestedType === 'issue' ? entityId : undefined,
          organisationId: suggestedType === 'organisation' ? entityId : undefined,
          closeMatchIds: closeMatches.map((m) => m.id),
          publicRecognition: publicRecognition ? 1 : 0,
          languageCode: userLang,
        });

        // Notify Setup Guides (fire-and-forget)
        notifySetupGuides(englishName, category, user.name ?? 'Anonymous', suggestion.id).catch(
          () => {},
        );

        return ok({
          suggestion,
          entity_id: entityId,
          entity_type: suggestedType,
          close_matches: closeMatches,
          message:
            'Your Quiet Riot is up and running now but in a limited way. You can say what you think and gather evidence. It will get a 👍 or 👎 within the next hour.',
        });
      }

      case 'get_suggestion_status': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const suggestions = await getSuggestionsByUser(user.id);
        return ok({ suggestions });
      }

      case 'respond_more_info': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const suggestionId = p.suggestion_id as string;
        const response = p.response as string;
        const suggestion = await getSuggestionById(suggestionId);
        if (!suggestion) return err('Suggestion not found', 404);
        if (suggestion.suggested_by !== user.id)
          return err('You can only respond to your own suggestions', 403);
        if (suggestion.status !== 'more_info_requested')
          return err('Suggestion is not waiting for more info');

        // Add the response as a feed post on the linked entity
        if (suggestion.issue_id) {
          await createFeedPost(suggestion.issue_id, user.id, `[More info]: ${response}`);
        }

        // Notify the reviewer
        if (suggestion.reviewer_id) {
          notifyUser(
            suggestion.reviewer_id,
            'suggestion_progress',
            `Response from ${user.name ?? 'First Rioter'}: ${suggestion.suggested_name}`,
            `The First Rioter responded to your question about "${suggestion.suggested_name}": ${response}`,
            'issue_suggestion',
            suggestionId,
            user.name ?? 'First Rioter',
          ).catch(() => {});
        }

        return ok({ suggestion, message: 'Your response has been sent to the Setup Guide.' });
      }

      case 'review_suggestion': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        // Role gate: must be setup_guide or administrator
        const isGuide = await hasRole(user.id, 'setup_guide');
        const isAdmin = await hasRole(user.id, 'administrator');
        if (!isGuide && !isAdmin) return err('Setup Guide role required', 403);

        const suggestionId = p.suggestion_id as string;
        const decision = p.decision as string;
        const suggestion = await getSuggestionById(suggestionId);
        if (!suggestion) return err('Suggestion not found', 404);

        switch (decision) {
          case 'approve': {
            const cat = (p.category as Category) || (suggestion.category as Category);
            const result = await approveSuggestion(
              suggestionId,
              user.id,
              cat,
              p.reviewer_notes as string | undefined,
            );
            // Notify First Rioter
            notifyUser(
              suggestion.suggested_by,
              'suggestion_approved',
              `Thumbs Up 👍: ${suggestion.suggested_name}`,
              `Great news — your Quiet Riot "${suggestion.suggested_name}" has been approved! It's now under review for translations.`,
              'issue_suggestion',
              suggestionId,
              user.name ?? 'Setup Guide',
            ).catch(() => {});
            return ok({ suggestion: result, decision: 'approved' });
          }
          case 'reject': {
            const reason = p.rejection_reason as RejectionReason;
            if (!reason) return err('rejection_reason is required for reject decision');
            const closeMatchIdsStr = p.close_match_ids as string | undefined;
            const closeMatchIdsArr = closeMatchIdsStr
              ? closeMatchIdsStr.split(',').map((s) => s.trim())
              : undefined;
            const result = await rejectSuggestion(
              suggestionId,
              user.id,
              reason,
              p.rejection_detail as string | undefined,
              closeMatchIdsArr,
            );
            // Notify First Rioter
            const reasonTexts: Record<RejectionReason, string> = {
              close_to_existing: 'It is too similar to an existing Quiet Riot.',
              about_people: 'Quiet Riots are about issues, not specific people.',
              illegal_subject: 'The subject matter is not appropriate.',
              other: (p.rejection_detail as string) || 'The suggestion was not approved.',
            };
            notifyUser(
              suggestion.suggested_by,
              'suggestion_rejected',
              `Update on ${suggestion.suggested_name}`,
              `Your suggestion "${suggestion.suggested_name}" wasn't approved. ${reasonTexts[reason]}`,
              'issue_suggestion',
              suggestionId,
              user.name ?? 'Setup Guide',
            ).catch(() => {});
            return ok({ suggestion: result, decision: 'rejected' });
          }
          case 'merge': {
            const mergeIssueId = p.merge_into_issue_id as string | undefined;
            const mergeOrgId = p.merge_into_org_id as string | undefined;
            if (!mergeIssueId && !mergeOrgId)
              return err('merge_into_issue_id or merge_into_org_id required for merge');
            const result = await mergeSuggestion(suggestionId, user.id, mergeIssueId, mergeOrgId);
            // Auto-join user into the merge target
            if (mergeIssueId) {
              await joinIssue(suggestion.suggested_by, mergeIssueId);
            }
            // Notify First Rioter
            notifyUser(
              suggestion.suggested_by,
              'suggestion_merged',
              `Your suggestion: ${suggestion.suggested_name}`,
              `Your suggestion "${suggestion.suggested_name}" is similar to an existing Quiet Riot. We've added you to that one instead.`,
              'issue_suggestion',
              suggestionId,
              user.name ?? 'Setup Guide',
            ).catch(() => {});
            return ok({ suggestion: result, decision: 'merged' });
          }
          case 'more_info': {
            const notes = p.reviewer_notes as string | undefined;
            if (!notes) return err('reviewer_notes required when requesting more info');
            const result = await requestSuggestionMoreInfo(suggestionId, user.id, notes);
            // Notify First Rioter
            notifyUser(
              suggestion.suggested_by,
              'suggestion_more_info',
              `${user.name ?? 'Setup Guide'}: Question about ${suggestion.suggested_name}`,
              `The Setup Guide has a question about your suggestion "${suggestion.suggested_name}": ${notes}`,
              'issue_suggestion',
              suggestionId,
              user.name ?? 'Setup Guide',
            ).catch(() => {});
            return ok({ suggestion: result, decision: 'more_info' });
          }
          default:
            return err('Invalid decision — must be approve, reject, merge, or more_info');
        }
      }

      case 'go_live_suggestion': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        // Role gate
        const isGuide = await hasRole(user.id, 'setup_guide');
        const isAdmin = await hasRole(user.id, 'administrator');
        if (!isGuide && !isAdmin) return err('Setup Guide role required', 403);

        const suggestionId = p.suggestion_id as string;
        const suggestion = await getSuggestionById(suggestionId);
        if (!suggestion) return err('Suggestion not found', 404);
        if (suggestion.status !== 'translations_ready')
          return err('Translations must be ready before going live');

        const result = await goLiveSuggestion(suggestionId);

        // Notify First Rioter about go-live
        notifyUser(
          suggestion.suggested_by,
          'suggestion_live',
          `${suggestion.suggested_name} is now live!`,
          `Your Quiet Riot "${suggestion.suggested_name}" has had the 👍! It's now live. Share it with friends who care about this issue.`,
          'issue_suggestion',
          suggestionId,
          user.name ?? 'Setup Guide',
        ).catch(() => {});

        // Notify guide
        notifyUser(
          user.id,
          'suggestion_live',
          `${suggestion.suggested_name} is now live!`,
          `You approved "${suggestion.suggested_name}" and it's now live.`,
          'issue_suggestion',
          suggestionId,
        ).catch(() => {});

        return ok({ suggestion: result, message: `${suggestion.suggested_name} is now live!` });
      }

      // ─── Inbox / Messages ────────────────────────────────
      case 'get_inbox': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const unreadOnly = p.unread_only as boolean;
        const limit = (p.limit as number) || 20;
        const messages = await getMessages(user.id, { unreadOnly, limit });
        const unreadCount = await getUnreadCount(user.id);
        return ok({ messages, unread_count: unreadCount });
      }

      case 'mark_message_read': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const messageId = p.message_id as string;
        const result = await markAsRead(messageId, user.id);
        return ok({ marked: result });
      }

      case 'mark_all_read': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const count = await markAllAsRead(user.id);
        return ok({ marked_count: count });
      }

      // ─── Admin/Setup Actions ────────────────────────────────

      case 'get_pending_suggestions': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        trackedUserId = user.id;

        const isGuide = await hasRole(user.id, 'setup_guide');
        const isAdmin = await hasRole(user.id, 'administrator');
        if (!isGuide && !isAdmin) return err('Setup Guide or Administrator role required', 403);

        const limit = (p.limit as number) || 20;
        const suggestions = await getSuggestionsByStatus('pending_review', limit, 0);
        return ok({ suggestions, count: suggestions.length });
      }

      case 'set_first_rioter_preference': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        trackedUserId = user.id;

        const suggestionId = p.suggestion_id as string;
        const suggestion = await getSuggestionById(suggestionId);
        if (!suggestion) return err('Suggestion not found', 404);

        // Only the person who suggested it can change this
        if (suggestion.suggested_by !== user.id) {
          return err('Only the First Rioter can change recognition preference', 403);
        }

        const publicRecognition = p.public_recognition as boolean;
        const updated = await setPublicRecognition(suggestionId, publicRecognition ? 1 : 0);
        return ok({
          suggestion: updated,
          preference: publicRecognition ? 'public' : 'anonymous',
        });
      }

      // ─── Email Linking ────────────────────────────────────

      case 'link_email': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        trackedUserId = user.id;

        const newEmail = (p.email as string).toLowerCase().trim();

        // Check email isn't already used by another user
        const existing = await getUserByEmail(newEmail);
        if (existing && existing.id !== user.id) {
          return err('This email is already linked to another account', 409);
        }

        // Create a verification token
        const db = getDb();
        const token = generateId();
        const expires = new Date(Date.now() + 24 * 60 * 60_000).toISOString(); // 24h

        await db.execute({
          sql: `INSERT INTO verification_tokens (identifier, token, expires, type)
                VALUES (?, ?, ?, 'email_verify')`,
          args: [`${user.id}:${newEmail}`, token, expires],
        });

        // Build verification URL
        const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quietriots.com';
        const verifyUrl = `${baseUrl}/api/auth/verify-email-link?token=${token}`;

        // Send verification email
        await sendEmail(
          newEmail,
          'Verify your email for Quiet Riots',
          `<p>Hi ${user.name},</p>
           <p>Click the link below to link this email to your Quiet Riots account:</p>
           <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;">Verify email</a></p>
           <p>This link expires in 24 hours.</p>
           <p>If you didn't request this, you can safely ignore this email.</p>
           <p>— Quiet Riots</p>`,
        );

        return ok({
          sent: true,
          email: newEmail,
          message: `Verification email sent to ${newEmail}. Ask the user to check their inbox and click the link.`,
        });
      }

      case 'verify_email_status': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);
        trackedUserId = user.id;

        const isWaEmail = (user.email || '').startsWith('wa-');
        return ok({
          email: user.email,
          is_placeholder: isWaEmail,
          verified: !isWaEmail,
          message: isWaEmail
            ? 'User has a WhatsApp placeholder email. Use link_email to set a real email.'
            : `User email is ${user.email}.`,
        });
      }

      // ─── Share Scheme ────────────────────────────────────────
      case 'get_share_status': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        let application = await getShareApplication(user.id);
        const eligibility = await checkShareEligibility(user.id);
        const wallet = await getWalletByUserId(user.id);

        // Auto-promote if eligible but status is still not_eligible
        if (application && application.status === 'not_eligible' && eligibility.eligible) {
          const promoted = await promoteToEligible(user.id);
          if (promoted) {
            application = await getShareApplication(user.id);
          }
        }

        return ok({
          status: application?.status ?? 'not_eligible',
          certificate_number: application?.certificate_number ?? null,
          issued_at: application?.issued_at ?? null,
          eligibility: {
            eligible: eligibility.eligible,
            riots_joined: eligibility.riotsJoined,
            riots_required: 3,
            actions_taken: eligibility.actionsTaken,
            actions_required: 10,
            is_verified: eligibility.isVerified,
          },
          wallet_balance_pence: wallet?.balance_pence ?? 0,
          payment_required_pence: 10,
          message:
            application?.status === 'issued'
              ? `Your share has been issued! Certificate: ${application.certificate_number}`
              : application?.status === 'not_eligible' || !application
                ? `You need ${Math.max(0, 3 - eligibility.riotsJoined)} more Quiet Riots and ${Math.max(0, 10 - eligibility.actionsTaken)} more actions to qualify.`
                : application?.status === 'available'
                  ? 'You are eligible for your Quiet Riots share! Visit your profile or say "apply for share" to proceed.'
                  : `Your share application is ${application.status.replace(/_/g, ' ')}.`,
        });
      }

      case 'get_share_eligibility': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const eligibility = await checkShareEligibility(user.id);
        return ok({
          eligible: eligibility.eligible,
          riots_joined: eligibility.riotsJoined,
          riots_required: 3,
          actions_taken: eligibility.actionsTaken,
          actions_required: 10,
          is_verified: eligibility.isVerified,
          message: eligibility.eligible
            ? 'You qualify for your Quiet Riots share!'
            : `Progress: ${eligibility.riotsJoined}/3 Quiet Riots joined, ${eligibility.actionsTaken}/10 actions taken${!eligibility.isVerified ? ', verification needed' : ''}.`,
        });
      }

      case 'apply_for_share': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        // Ensure application exists and auto-promote if eligible
        let app = await getOrCreateShareApplication(user.id);
        if (app.status === 'not_eligible') {
          const promoted = await promoteToEligible(user.id);
          if (promoted) {
            app = await getOrCreateShareApplication(user.id);
          }
        }
        if (app.status !== 'available') {
          return err(
            app.status === 'not_eligible'
              ? 'You are not yet eligible for a share. Join more Quiet Riots and take more actions.'
              : `Cannot apply — your current status is ${app.status.replace(/_/g, ' ')}.`,
          );
        }

        // Check wallet balance
        const wallet = await getOrCreateWallet(user.id);
        if (wallet.balance_pence < 10) {
          return err(
            `Insufficient wallet balance. You need at least 10p (you have ${wallet.balance_pence}p). Top up your wallet first.`,
          );
        }

        // Proceed with share — atomic 10p debit + status change
        const result = await proceedWithShare(user.id, wallet.id);
        if (!result) {
          return err('Payment failed — please try again.');
        }

        // Notify share guides about new application
        notifyShareGuides(user.name ?? 'A Quiet Rioter', user.id).catch(() => {});

        return ok({
          status: 'under_review',
          message:
            '10p has been deducted from your wallet. Your share application is now under review. A Share Guide will review it shortly.',
        });
      }

      case 'decline_share': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const declined = await declineShare(user.id);
        if (!declined) {
          return err(
            'Cannot decline — either you have no eligible share offer or your application is already in progress.',
          );
        }

        return ok({
          status: 'declined',
          message:
            'You have permanently declined the share offer. No payment was taken. This decision cannot be reversed.',
        });
      }

      case 'withdraw_share': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const withdrawn = await withdrawShare(user.id);
        if (!withdrawn) {
          return err('Cannot withdraw — your application may not be in a withdrawable state.');
        }

        return ok({
          status: 'withdrawn',
          message:
            'Your share application has been withdrawn and your 10p has been refunded to your wallet.',
        });
      }

      case 'reapply_share': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const wallet = await getOrCreateWallet(user.id);
        if (wallet.balance_pence < 10) {
          return err(
            `Insufficient wallet balance. You need at least 10p (you have ${wallet.balance_pence}p). Top up your wallet first.`,
          );
        }

        const reapplied = await reapplyForShare(user.id, wallet.id);
        if (!reapplied) {
          return err('Cannot reapply — your application may not be in a rejected state.');
        }

        // Notify share guides
        notifyShareGuides(user.name ?? 'A Quiet Rioter', user.id).catch(() => {});

        return ok({
          status: 'under_review',
          message:
            '10p has been deducted from your wallet. Your share re-application is now under review.',
        });
      }

      case 'ask_share_question': {
        const phone = p.phone as string;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        const app = await getShareApplication(user.id);
        if (!app) {
          return err("You don't have a share application yet.");
        }

        // Create message visible to share guide
        await createShareMessage(app.id, user.id, 'applicant', p.message as string);

        // Notify share guides about the question
        notifyShareGuidesQuestion(user.name ?? 'A Quiet Rioter', p.message as string, app.id).catch(
          () => {},
        );

        return ok({
          message:
            'Your question has been sent to the Share Guide team. You will receive a reply in your inbox.',
        });
      }

      // ─── OTP Delivery (for local polling script) ───────────
      case 'get_undelivered_codes': {
        const codes = await getUndeliveredCodes();
        return ok({ codes });
      }

      case 'mark_code_delivered': {
        const codeId = p.code_id as string;
        const delivered = await markCodeDelivered(codeId);
        return ok({ delivered });
      }

      // ─── Message Delivery (for local polling script) ──────
      case 'get_undelivered_messages': {
        const messages = await getUndeliveredMessages();
        return ok({ messages });
      }

      case 'mark_message_delivered': {
        const messageId = p.message_id as string;
        const delivered = await markMessageDelivered(messageId);
        return ok({ delivered });
      }

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (error) {
    trackedStatus = 'error';
    trackedError = error instanceof Error ? error.message : 'Unknown error';
    log.error({ action, err: error, durationMs: Date.now() - startTime }, 'Bot request failed');
    return err('Internal server error', 500);
  } finally {
    const durationMs = Date.now() - startTime;
    log.info({ action, durationMs }, 'Bot request completed');

    // Fire-and-forget analytics — don't await, don't let it break the response
    trackBotEvent({
      action,
      userId: trackedUserId,
      issueId: trackedIssueId,
      durationMs,
      status: trackedStatus,
      errorMessage: trackedError,
      metadata:
        trackedOrgId || trackedAssistantCategory
          ? { orgId: trackedOrgId, assistantCategory: trackedAssistantCategory }
          : null,
    }).catch(() => {});
  }
}
