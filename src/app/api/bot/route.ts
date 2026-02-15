import { NextRequest, NextResponse } from 'next/server';
import { getAllIssues, getIssueById, getTrendingIssues } from '@/lib/queries/issues';
import { getAllOrganisations, getOrganisationById, getOrgsForIssue, getIssuesForOrg, getTotalRiotersForOrg } from '@/lib/queries/organisations';
import { getFilteredActions, getActionCountForIssue } from '@/lib/queries/actions';
import { getCommunityHealth, getExpertProfiles, getFeedPosts, createFeedPost, getCountryBreakdown } from '@/lib/queries/community';
import { getUserByPhone, createUser, updateUser, joinIssue, leaveIssue, getUserIssues } from '@/lib/queries/users';
import { getSynonymsForIssue, addSynonym } from '@/lib/queries/synonyms';

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

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

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return err('Unauthorized', 401);
  }

  let body: { action: string; params: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { action, params = {} } = body;

  switch (action) {
    // ─── User Identity ───────────────────────────────────
    case 'identify': {
      const phone = params.phone as string;
      if (!phone) return err('phone is required');

      let user = await getUserByPhone(phone);
      if (!user) {
        const digits = phone.replace(/\D/g, '');
        const email = `wa-${digits}@whatsapp.quietriots.com`;
        const name = (params.name as string) || 'WhatsApp User';
        user = await createUser({ name, email, phone });
      }
      const issues = await getUserIssues(user.id);
      return ok({ user, issues });
    }

    // ─── Issue Discovery ─────────────────────────────────
    case 'search_issues': {
      const query = params.query as string;
      if (!query) return err('query is required');
      const issues = await getAllIssues(undefined, query);
      return ok({ issues });
    }

    case 'get_trending': {
      const limit = (params.limit as number) || 6;
      const issues = await getTrendingIssues(limit);
      return ok({ issues });
    }

    case 'get_issue': {
      const issueId = params.issue_id as number;
      if (!issueId) return err('issue_id is required');

      const issue = await getIssueById(issueId);
      if (!issue) return err('Issue not found', 404);

      const [health, countries, pivotOrgs, actionCount, synonyms] = await Promise.all([
        getCommunityHealth(issue.id),
        getCountryBreakdown(issue.id),
        getOrgsForIssue(issue.id),
        getActionCountForIssue(issue.id),
        getSynonymsForIssue(issue.id),
      ]);
      return ok({ issue, health, countries, pivotOrgs, actionCount, synonyms });
    }

    // ─── Actions ─────────────────────────────────────────
    case 'get_actions': {
      const issueId = params.issue_id as number;
      if (!issueId) return err('issue_id is required');

      const actions = await getFilteredActions(issueId, {
        type: params.type as string | undefined,
        time: params.time as string | undefined,
        skills: params.skills as string | undefined,
      });
      return ok({ actions });
    }

    // ─── Community ───────────────────────────────────────
    case 'get_community': {
      const issueId = params.issue_id as number;
      if (!issueId) return err('issue_id is required');

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
      const phone = params.phone as string;
      const issueId = params.issue_id as number;
      if (!phone || !issueId) return err('phone and issue_id are required');

      const user = await getUserByPhone(phone);
      if (!user) return err('User not found — call identify first', 404);

      await joinIssue(user.id, issueId);
      return ok({ joined: true, user_id: user.id, issue_id: issueId });
    }

    case 'leave_issue': {
      const phone = params.phone as string;
      const issueId = params.issue_id as number;
      if (!phone || !issueId) return err('phone and issue_id are required');

      const user = await getUserByPhone(phone);
      if (!user) return err('User not found', 404);

      await leaveIssue(user.id, issueId);
      return ok({ left: true, user_id: user.id, issue_id: issueId });
    }

    // ─── Feed ────────────────────────────────────────────
    case 'post_feed': {
      const phone = params.phone as string;
      const issueId = params.issue_id as number;
      const content = params.content as string;
      if (!phone || !issueId || !content) return err('phone, issue_id, and content are required');

      const user = await getUserByPhone(phone);
      if (!user) return err('User not found — call identify first', 404);

      const post = await createFeedPost(issueId, user.id, content);
      return ok({ post });
    }

    // ─── Organisation Pivot ──────────────────────────────
    case 'get_org_pivot': {
      const orgId = params.org_id as number;
      if (!orgId) return err('org_id is required');

      const org = await getOrganisationById(orgId);
      if (!org) return err('Organisation not found', 404);

      const [issues, totalRioters] = await Promise.all([
        getIssuesForOrg(org.id),
        getTotalRiotersForOrg(org.id),
      ]);
      return ok({ org, issues, totalRioters });
    }

    case 'get_orgs': {
      const category = params.category as string | undefined;
      const orgs = await getAllOrganisations(category as never);
      return ok({ orgs });
    }

    // ─── Synonyms ────────────────────────────────────────
    case 'add_synonym': {
      const issueId = params.issue_id as number;
      const term = params.term as string;
      if (!issueId || !term) return err('issue_id and term are required');

      const synonym = await addSynonym(issueId, term);
      return ok({ synonym });
    }

    // ─── User Profile ────────────────────────────────────
    case 'update_user': {
      const phone = params.phone as string;
      if (!phone) return err('phone is required');

      const user = await getUserByPhone(phone);
      if (!user) return err('User not found — call identify first', 404);

      const updated = await updateUser(user.id, {
        name: params.name as string | undefined,
        time_available: params.time_available as string | undefined,
        skills: params.skills as string | undefined,
      });
      return ok({ user: updated });
    }

    default:
      return err(`Unknown action: ${action}`);
  }
}
