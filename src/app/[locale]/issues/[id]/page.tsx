import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
import {
  translateEntity,
  translateIssuePivotRows,
  translateOrgPivotRows,
  translateSynonyms,
} from '@/lib/queries/translate';
import { getSession } from '@/lib/session';
import { getSuggestionByIssueId } from '@/lib/queries/suggestions';
import { getUserById } from '@/lib/queries/users';
import { hasRole } from '@/lib/queries/roles';
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
import { FirstRioterBadge } from '@/components/data/first-rioter-badge';
import { getActionCountForIssue } from '@/lib/queries/actions';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function IssueDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('IssueDetail');
  const tc = await getTranslations('Categories');
  const tFr = await getTranslations('FirstRioter');

  const rawIssue = await getIssueById(id);
  if (!rawIssue) notFound();

  const userId = await getSession();

  // Pending issues: only visible to creator + Setup Guides
  if (rawIssue.status === 'pending_review') {
    const isCreator = userId === rawIssue.first_rioter_id;
    const isGuide = userId ? await hasRole(userId, 'setup_guide') : false;
    const isAdmin = userId ? await hasRole(userId, 'administrator') : false;
    if (!isCreator && !isGuide && !isAdmin) notFound();
  }
  if (rawIssue.status === 'rejected') notFound();

  const issue = await translateEntity(rawIssue, 'issue', locale);
  const joined = userId ? await hasJoinedIssue(userId, issue.id) : false;

  // First Rioter data
  let firstRioterUser: { id: string; name: string | null; image: string | null } | null = null;
  let isPublicRecognition = true;
  if (issue.first_rioter_id && issue.status === 'active') {
    const [user, suggestion] = await Promise.all([
      getUserById(issue.first_rioter_id),
      getSuggestionByIssueId(issue.id),
    ]);
    if (user) {
      firstRioterUser = {
        id: user.id,
        name: user.display_name || user.name,
        image: user.avatar_url,
      };
    }
    if (suggestion) {
      isPublicRecognition = suggestion.public_recognition === 1;
    }
  }

  // Load all data in parallel
  const rawIssuePivotRows = await getOrgsForIssue(issue.id);
  const firstOrg = rawIssuePivotRows[0];
  const rawOrgPivotRows = firstOrg ? await getIssuesForOrg(firstOrg.organisation_id) : [];
  const [issuePivotRows, orgPivotRows] = await Promise.all([
    translateIssuePivotRows(rawIssuePivotRows, locale),
    translateOrgPivotRows(rawOrgPivotRows, locale),
  ]);
  const actions = await getActionsForIssue(issue.id);
  const actionCount = await getActionCountForIssue(issue.id);
  const health = await getCommunityHealth(issue.id);
  const experts = await getExpertProfiles(issue.id);
  const feedPosts = await getFeedPosts(issue.id);
  const countries = await getCountryBreakdown(issue.id);
  const rawSynonyms = await getSynonymsForIssue(issue.id);
  const synonyms = await translateSynonyms(rawSynonyms, locale);
  const reels = await getReelsForIssue(issue.id);
  const campaigns = await getCampaignsForIssue(issue.id);
  const evidence = await getEvidenceForIssue(issue.id);
  const assistant = await getAssistantByCategory(toAssistantCategory(issue.category));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={issue.name}
        breadcrumbs={[
          { label: t('breadcrumb'), href: '/issues' },
          { label: tc(issue.category), href: `/issues?category=${issue.category}` },
          { label: issue.name },
        ]}
      />

      {/* Category + Trending */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CategoryBadge category={issue.category} label={tc(issue.category)} size="md" />
        <TrendingIndicator delta={issue.trending_delta} size="md" />
      </div>

      {/* Pending review banner */}
      {issue.status === 'pending_review' && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {t('pendingBanner')}
          </p>
        </div>
      )}

      {/* First Rioter badge */}
      {firstRioterUser && issue.status === 'active' && (
        <div className="mb-4">
          <FirstRioterBadge
            userId={firstRioterUser.id}
            userName={firstRioterUser.name}
            userImage={firstRioterUser.image}
            isPublic={isPublicRecognition}
            approvedAt={issue.approved_at}
            locale={locale}
            labels={{
              imageAlt: tFr('imageAlt'),
              fallbackName: tFr('fallbackName'),
              badge: tFr('badge'),
              anonymous: tFr('anonymous'),
            }}
          />
        </div>
      )}

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
            {t('alsoKnownAs')}
          </p>
          <SynonymList synonyms={synonyms} issueId={issue.id} />
        </div>
      )}

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge value={issue.rioter_count} label={t('rioters')} emoji="📊" />
        <StatBadge
          value={issue.country_count}
          label={t('country', { count: issue.country_count })}
          emoji="🌍"
        />
        <StatBadge
          value={`+${issue.trending_delta.toLocaleString()}`}
          label={t('thisWeek')}
          emoji="📈"
        />
        <StatBadge value={actionCount} label={t('actions')} emoji="⚡" />
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
        <h2 className="mb-4 text-lg font-bold">{t('actionsTitle')}</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('actionsDesc')}</p>
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
        <h2 className="mb-4 text-lg font-bold">{t('gatherEvidence')}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('gatherEvidenceDesc')}</p>
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
        <h2 className="mb-4 text-lg font-bold">{t('riotReels')}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('riotReelsDesc')}</p>
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
          <h2 className="mb-4 text-lg font-bold">{t('experts')}</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('expertsDesc')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {experts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        </section>
      )}

      {/* Community Feed */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t('communityFeed')}</h2>
        <FeedSection issueId={issue.id} initialPosts={feedPosts} />
      </section>
    </div>
  );
}
