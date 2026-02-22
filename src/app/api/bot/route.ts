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
  getOrCreateWallet,
  createTopupTransaction,
  createContribution,
  getUserSpendingSummary,
} from '@/lib/queries/wallet';
import { getCampaigns } from '@/lib/queries/campaigns';
import { rateLimit } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

// ─── Zod Schemas ──────────────────────────────────────────
const phoneParam = z.object({ phone: z.string().min(1), name: z.string().optional() });
const issueIdParam = z.object({ issue_id: z.string().min(1) });
const phoneAndIssue = z.object({ phone: z.string().min(1), issue_id: z.string().min(1) });
const queryParam = z.object({ query: z.string().min(1) });

const actionSchemas = {
  identify: phoneParam,
  search_issues: queryParam,
  get_trending: z.object({ limit: z.number().int().positive().optional() }),
  get_issue: issueIdParam,
  get_actions: issueIdParam.extend({
    type: z.string().optional(),
    time: z.string().optional(),
    skills: z.string().optional(),
  }),
  get_community: issueIdParam,
  join_issue: phoneAndIssue,
  leave_issue: phoneAndIssue,
  post_feed: phoneAndIssue.extend({ content: z.string().min(1) }),
  get_org_pivot: z.object({ org_id: z.string().min(1) }),
  get_orgs: z.object({ category: z.string().optional() }),
  add_synonym: z.object({ issue_id: z.string().min(1), term: z.string().min(1) }),
  update_user: z.object({
    phone: z.string().min(1),
    name: z.string().optional(),
    time_available: z.enum(['1min', '10min', '1hr+']).optional(),
    skills: z.string().optional(),
  }),
  create_issue: z.object({
    name: z.string().min(1, 'Issue name required'),
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
    description: z.string().optional().default(''),
  }),
  get_riot_reel: phoneAndIssue,
  submit_riot_reel: z.object({
    phone: z.string().min(1),
    issue_id: z.string().min(1),
    youtube_url: z.string().min(1),
    caption: z.string().optional().default(''),
  }),
  get_wallet: phoneParam,
  topup_wallet: z.object({
    phone: z.string().min(1),
    amount_pence: z.number().int().min(100, 'Minimum top-up is £1'),
  }),
  contribute: z.object({
    phone: z.string().min(1),
    campaign_id: z.string().min(1),
    amount_pence: z.number().int().min(10, 'Minimum contribution is 10p'),
  }),
  get_campaigns: z.object({
    issue_id: z.string().optional(),
    status: z.enum(['active', 'funded', 'disbursed', 'cancelled']).optional(),
  }),
} as const;

type ActionName = keyof typeof actionSchemas;

const bodySchema = z.object({
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Helpers ──────────────────────────────────────────────
function verifyAuth(request: NextRequest): boolean {
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

  try {
    switch (action) {
      // ─── User Identity ───────────────────────────────────
      case 'identify': {
        const phone = p.phone as string;
        let user = await getUserByPhone(phone);
        if (!user) {
          const digits = phone.replace(/\D/g, '');
          const email = `wa-${digits}@whatsapp.quietriots.com`;
          const name = (p.name as string) || 'WhatsApp User';
          user = await createUser({ name, email, phone });
        }
        const issues = await getUserIssues(user.id);
        return ok({ user, issues });
      }

      // ─── Issue Discovery ─────────────────────────────────
      case 'search_issues': {
        const issues = await getAllIssues(undefined, p.query as string);
        return ok({ issues });
      }

      case 'get_trending': {
        const limit = (p.limit as number) || 6;
        const issues = await getTrendingIssues(limit);
        return ok({ issues });
      }

      case 'get_issue': {
        const issueId = p.issue_id as string;
        const issue = await getIssueById(issueId);
        if (!issue) return err('Issue not found', 404);

        const [
          health,
          countries,
          pivotOrgs,
          actionCount,
          synonyms,
          seasonalPattern,
          relatedIssues,
        ] = await Promise.all([
          getCommunityHealth(issue.id),
          getCountryBreakdown(issue.id),
          getOrgsForIssue(issue.id),
          getActionCountForIssue(issue.id),
          getSynonymsForIssue(issue.id),
          getSeasonalPattern(issue.id),
          getRelatedIssues(issue.id),
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
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found — call identify first', 404);

        await joinIssue(user.id, issueId);
        return ok({ joined: true, user_id: user.id, issue_id: issueId });
      }

      case 'leave_issue': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found', 404);

        await leaveIssue(user.id, issueId);
        return ok({ left: true, user_id: user.id, issue_id: issueId });
      }

      // ─── Feed ────────────────────────────────────────────
      case 'post_feed': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const content = p.content as string;
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found — call identify first', 404);

        const post = await createFeedPost(issueId, user.id, content);
        return ok({ post });
      }

      // ─── Organisation Pivot ──────────────────────────────
      case 'get_org_pivot': {
        const orgId = p.org_id as string;
        const org = await getOrganisationById(orgId);
        if (!org) return err('Organisation not found', 404);

        const [issues, totalRioters] = await Promise.all([
          getIssuesForOrg(org.id),
          getTotalRiotersForOrg(org.id),
        ]);
        return ok({ org, issues, totalRioters });
      }

      case 'get_orgs': {
        const category = p.category as string | undefined;
        const orgs = await getAllOrganisations(category as never);
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
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found — call identify first', 404);

        const updated = await updateUser(user.id, {
          name: p.name as string | undefined,
          time_available: p.time_available as string | undefined,
          skills: p.skills as string | undefined,
        });
        return ok({ user: updated });
      }

      // ─── Riot Reels ──────────────────────────────────────
      case 'get_riot_reel': {
        const phone = p.phone as string;
        const issueId = p.issue_id as string;
        const user = await getUserByPhone(phone);
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
        const user = await getUserByPhone(phone);
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
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found — call identify first', 404);

        const wallet = await getOrCreateWallet(user.id);
        const summary = await getUserSpendingSummary(user.id);
        return ok({ wallet, summary });
      }

      case 'topup_wallet': {
        const phone = p.phone as string;
        const amountPence = p.amount_pence as number;
        const user = await getUserByPhone(phone);
        if (!user) return err('User not found — call identify first', 404);

        const wallet = await getOrCreateWallet(user.id);
        const { transaction, paymentUrl } = await createTopupTransaction(wallet.id, amountPence);
        return ok({ transaction, paymentUrl });
      }

      case 'contribute': {
        const phone = p.phone as string;
        const campaignId = p.campaign_id as string;
        const amountPence = p.amount_pence as number;
        const user = await getUserByPhone(phone);
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
        const campaigns = await getCampaigns(issueId, status);
        return ok({ campaigns });
      }

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (error) {
    log.error({ action, err: error, durationMs: Date.now() - startTime }, 'Bot request failed');
    return err('Internal server error', 500);
  } finally {
    log.info({ action, durationMs: Date.now() - startTime }, 'Bot request completed');
  }
}
