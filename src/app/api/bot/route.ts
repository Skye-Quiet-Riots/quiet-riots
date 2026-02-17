import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllIssues, getIssueById, getTrendingIssues } from '@/lib/queries/issues';
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
import { rateLimit } from '@/lib/rate-limit';

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

// ─── Zod Schemas ──────────────────────────────────────────
const phoneParam = z.object({ phone: z.string().min(1), name: z.string().optional() });
const issueIdParam = z.object({ issue_id: z.number().int().positive() });
const phoneAndIssue = z.object({ phone: z.string().min(1), issue_id: z.number().int().positive() });
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
  get_org_pivot: z.object({ org_id: z.number().int().positive() }),
  get_orgs: z.object({ category: z.string().optional() }),
  add_synonym: z.object({ issue_id: z.number().int().positive(), term: z.string().min(1) }),
  update_user: z.object({
    phone: z.string().min(1),
    name: z.string().optional(),
    time_available: z.string().optional(),
    skills: z.string().optional(),
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
  return NextResponse.json({ ok: false, error: message }, { status });
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

  if (!(action in actionSchemas)) {
    return err(`Unknown action: ${action}`);
  }

  const result = parseParams(action as ActionName, params);
  if (!result.success) {
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
      const issueId = p.issue_id as number;
      const issue = await getIssueById(issueId);
      if (!issue) return err('Issue not found', 404);

      const [health, countries, pivotOrgs, actionCount, synonyms, seasonalPattern, relatedIssues] =
        await Promise.all([
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
      const issueId = p.issue_id as number;
      const actions = await getFilteredActions(issueId, {
        type: p.type as string | undefined,
        time: p.time as string | undefined,
        skills: p.skills as string | undefined,
      });
      return ok({ actions });
    }

    // ─── Community ───────────────────────────────────────
    case 'get_community': {
      const issueId = p.issue_id as number;
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
      const issueId = p.issue_id as number;
      const user = await getUserByPhone(phone);
      if (!user) return err('User not found — call identify first', 404);

      await joinIssue(user.id, issueId);
      return ok({ joined: true, user_id: user.id, issue_id: issueId });
    }

    case 'leave_issue': {
      const phone = p.phone as string;
      const issueId = p.issue_id as number;
      const user = await getUserByPhone(phone);
      if (!user) return err('User not found', 404);

      await leaveIssue(user.id, issueId);
      return ok({ left: true, user_id: user.id, issue_id: issueId });
    }

    // ─── Feed ────────────────────────────────────────────
    case 'post_feed': {
      const phone = p.phone as string;
      const issueId = p.issue_id as number;
      const content = p.content as string;
      const user = await getUserByPhone(phone);
      if (!user) return err('User not found — call identify first', 404);

      const post = await createFeedPost(issueId, user.id, content);
      return ok({ post });
    }

    // ─── Organisation Pivot ──────────────────────────────
    case 'get_org_pivot': {
      const orgId = p.org_id as number;
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
      const issueId = p.issue_id as number;
      const term = p.term as string;
      const synonym = await addSynonym(issueId, term);
      return ok({ synonym });
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

    default:
      return err(`Unknown action: ${action}`);
  }
}
