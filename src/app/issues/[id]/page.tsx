import { notFound } from 'next/navigation';
import { getIssueById } from '@/lib/queries/issues';
import { getOrgsForIssue } from '@/lib/queries/organisations';
import { getIssuesForOrg } from '@/lib/queries/organisations';
import { getActionsForIssue } from '@/lib/queries/actions';
import {
  getCommunityHealth,
  getExpertProfiles,
  getFeedPosts,
  getCountryBreakdown,
} from '@/lib/queries/community';
import { getSynonymsForIssue } from '@/lib/queries/synonyms';
import { getReelsForIssue } from '@/lib/queries/reels';
import { getCampaignsForIssue } from '@/lib/queries/campaigns';
import { hasJoinedIssue } from '@/lib/queries/users';
import { getAssistantByCategory } from '@/lib/queries/assistants';
import { getEvidenceForIssue } from '@/lib/queries/evidence';
import { getSession } from '@/lib/session';
import { toAssistantCategory } from '@/types';

import { PageHeader } from '@/components/layout/page-header';
import { CategoryBadge } from '@/components/data/category-badge';
import { StatBadge } from '@/components/data/stat-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import { HealthMeter } from '@/components/data/health-meter';
import { CountryList } from '@/components/data/country-list';
import { SynonymList } from '@/components/data/synonym-list';
import { ExpertCard } from '@/components/cards/expert-card';
import { PivotToggle } from '@/components/interactive/pivot-toggle';
import { JoinButton } from '@/components/interactive/join-button';
import { ActionsSection } from '@/components/interactive/actions-section';
import { FeedSection } from '@/components/interactive/feed-section';
import { ReelsSection } from '@/components/interactive/reels-section';
import { CampaignProgress } from '@/components/data/campaign-progress';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { AssistantDetailBanner } from '@/components/data/assistant-detail-banner';
import { getActionCountForIssue } from '@/lib/queries/actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) notFound();

  const userId = await getSession();
  const joined = userId ? await hasJoinedIssue(userId, issue.id) : false;

  // Load all data in parallel
  const issuePivotRows = await getOrgsForIssue(issue.id);
  const firstOrg = issuePivotRows[0];
  const orgPivotRows = firstOrg ? await getIssuesForOrg(firstOrg.organisation_id) : [];
  const actions = await getActionsForIssue(issue.id);
  const actionCount = await getActionCountForIssue(issue.id);
  const health = await getCommunityHealth(issue.id);
  const experts = await getExpertProfiles(issue.id);
  const feedPosts = await getFeedPosts(issue.id);
  const countries = await getCountryBreakdown(issue.id);
  const synonyms = await getSynonymsForIssue(issue.id);
  const reels = await getReelsForIssue(issue.id);
  const campaigns = await getCampaignsForIssue(issue.id);
  const evidence = await getEvidenceForIssue(issue.id);
  const assistant = await getAssistantByCategory(toAssistantCategory(issue.category));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={issue.name}
        breadcrumbs={[
          { label: 'Issues', href: '/issues' },
          { label: issue.category, href: `/issues?category=${issue.category}` },
          { label: issue.name },
        ]}
      />

      {/* Category + Trending */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CategoryBadge category={issue.category} size="md" />
        <TrendingIndicator delta={issue.trending_delta} size="md" />
      </div>

      {/* Assistants */}
      {assistant && (
        <div className="mb-6">
          <AssistantDetailBanner
            assistant={assistant}
            agentHelps={issue.agent_helps}
            humanHelps={issue.human_helps}
            focus={issue.agent_focus ?? assistant.focus}
          />
        </div>
      )}

      {/* Description */}
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">{issue.description}</p>

      {/* Synonyms */}
      {synonyms.length > 0 && (
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Also known as
          </p>
          <SynonymList synonyms={synonyms} issueId={issue.id} />
        </div>
      )}

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge value={issue.rioter_count} label="rioters" emoji="📊" />
        <StatBadge
          value={issue.country_count}
          label={issue.country_count === 1 ? 'country' : 'countries'}
          emoji="🌍"
        />
        <StatBadge
          value={`+${issue.trending_delta.toLocaleString()}`}
          label="this week"
          emoji="📈"
        />
        <StatBadge value={actionCount} label="actions" emoji="⚡" />
      </div>

      {/* Join button */}
      <div className="mb-8">
        <JoinButton issueId={issue.id} initialJoined={joined} />
      </div>

      {/* The Pivot — THE killer feature */}
      <section className="mb-8">
        <PivotToggle
          issuePivotRows={issuePivotRows}
          orgPivotRows={orgPivotRows}
          currentOrgId={firstOrg?.organisation_id}
          currentIssueId={issue.id}
          issueName={issue.name}
          orgName={firstOrg?.organisation_name}
        />
      </section>

      {/* Actions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">⚡ Actions — Your Personalised Toolkit</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Based on evolution — 💡 <strong>Ideas</strong> (variation), ⚡ <strong>Actions</strong>{' '}
          (selection), and 🤝 <strong>Together</strong> (community).
        </p>
        <ActionsSection issueId={issue.id} initialActions={actions} />
      </section>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <section className="mb-8">
          <CampaignProgress campaigns={campaigns} />
        </section>
      )}

      {/* Gather Evidence */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">📹 Gather Evidence</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Document what&apos;s happening — go live or share photos, videos, and links.
        </p>
        <EvidenceSection
          issueId={issue.id}
          initialEvidence={evidence}
          organisations={issuePivotRows.map((r) => ({
            id: r.organisation_id,
            name: r.organisation_name,
          }))}
        />
      </section>

      {/* Riot Reels */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">🎬 Riot Reels</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Funny and ironic videos that capture the spirit of this Quiet Riot.
        </p>
        <ReelsSection issueId={issue.id} initialReels={reels} />
      </section>

      {/* Two-column layout for sidebar content */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Community Health */}
        {health && (
          <section>
            <HealthMeter health={health} />
          </section>
        )}

        {/* Countries */}
        {countries.length > 0 && (
          <section>
            <CountryList countries={countries} />
          </section>
        )}
      </div>

      {/* Experts */}
      {experts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold">🌟 Experts</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Passionate volunteers who go deeper — translators, specialists, media leads, legal
            advisors.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {experts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        </section>
      )}

      {/* Community Feed */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">💬 Community Feed</h2>
        <FeedSection issueId={issue.id} initialPosts={feedPosts} />
      </section>
    </div>
  );
}
