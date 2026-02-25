import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllIssues, getIssueById, getTrendingIssues, createIssue } from '@/lib/queries/issues';
import {
  getAllOrganisations,
  getOrganisationById,
  getOrgsForIssue,
  getIssuesForOrg,
  getTotalRiotersForOrg,
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
  createContribution,
  getUserSpendingSummary,
} from '@/lib/queries/wallet';
import { getCampaigns } from '@/lib/queries/campaigns';
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
  translateCampaigns,
  translateIssuePivotRows,
  translateOrgPivotRows,
} from '@/lib/queries/translate';
import { getUserMemories, saveMemory, deleteMemory } from '@/lib/queries/memory';
import type { MemoryCategory } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';
import { trackBotEvent } from '@/lib/queries/bot-events';
import { sanitizeText } from '@/lib/sanitize';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_USING_DEV_KEY = !process.env.BOT_API_KEY;

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
    amount_pence: z.number().int().min(10, 'Minimum contribution is 10p').max(1000000),
  }),
  get_campaigns: z.object({
    issue_id: idField.optional(),
    status: z.enum(['active', 'funded', 'disbursed', 'cancelled']).optional(),
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
} as const;

type ActionName = keyof typeof actionSchemas;

const bodySchema = z.object({
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Helpers ──────────────────────────────────────────────
function verifyAuth(request: NextRequest): boolean {
  if (IS_USING_DEV_KEY && process.env.NODE_ENV === 'production') {
    return false; // Reject all bot requests if no real API key is configured
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
        let issues = await getAllIssues(undefined, p.query as string);
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
        const [issue, pivotOrgs, relatedIssues] = await Promise.all([
          translateEntity(rawIssue, 'issue', locale),
          translateIssuePivotRows(rawPivotOrgs, locale),
          translateOrgPivotRows(rawRelatedIssues, locale),
        ]);
        return ok({
          issue,
          health,
          countries,
          pivotOrgs,
          actionCount,
          synonyms,
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

      // ─── Create Issue ───────────────────────────────────
      case 'create_issue': {
        const name = p.name as string;
        const category = p.category as string;
        const description = (p.description as string) || '';
        const issue = await createIssue({
          name,
          category: category as import('@/types').Category,
          description,
        });
        return ok({ issue });
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
        const phone = p.phone as string;
        const campaignId = p.campaign_id as string;
        const amountPence = p.amount_pence as number;
        const user = await resolveUser(phone);
        if (!user) return err('User not found — call identify first', 404);

        try {
          const result = await createContribution(user.id, campaignId, amountPence);
          const wallet = await getOrCreateWallet(user.id);
          return ok({
            transaction: result.transaction,
            campaign: result.campaign,
            wallet_balance_pence: wallet.balance_pence,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Contribution failed';
          if (message === 'Insufficient funds') return err(message);
          if (message === 'Campaign not found') return err(message, 404);
          if (message === 'Campaign is not active') return err(message);
          if (message === 'Wallet not found') return err(message, 404);
          throw e;
        }
      }

      case 'get_campaigns': {
        const issueId = p.issue_id as string | undefined;
        const status = p.status as import('@/types').CampaignStatus | undefined;
        const locale = (p.language_code as string) || 'en';
        let campaigns = await getCampaigns(issueId, status);
        campaigns = await translateCampaigns(campaigns, locale);
        return ok({ campaigns });
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
