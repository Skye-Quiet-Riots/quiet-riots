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
import { getActionInitiativesForIssue } from '@/lib/queries/action-initiatives';
import { hasJoinedIssue, hasFollowedIssue, getFollowerCount } from '@/lib/queries/users';
import { getAssistantByCategory } from '@/lib/queries/assistants';
import { getEvidenceForIssue } from '@/lib/queries/evidence';
import {
  translateEntity,
  translateActions,
  translateExpertProfiles,
  translateRiotReels,
  translateActionInitiatives,
  translateCountryBreakdown,
  translateIssuePivotRows,
  translateOrgPivotRows,
  translateSynonyms,
  translateCategoryAssistant,
} from '@/lib/queries/translate';
import { getSession } from '@/lib/session';
import { getSuggestionByIssueId } from '@/lib/queries/suggestions';
import { getUserById } from '@/lib/queries/users';
import { hasRole } from '@/lib/queries/roles';
import { toAssistantCategory } from '@/types';

import { HeroImage } from '@/components/layout/hero-image';
import { SectionNav } from '@/components/layout/section-nav';
import { StatBadge } from '@/components/data/stat-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import { HealthMeter } from '@/components/data/health-meter';
import { CountryList } from '@/components/data/country-list';
import { SynonymList } from '@/components/data/synonym-list';
import { ExpertCard } from '@/components/cards/expert-card';
import { PivotToggle } from '@/components/interactive/pivot-toggle';
import { JoinButton } from '@/components/interactive/join-button';
import { FollowButton } from '@/components/interactive/follow-button';
import { ActionsSection } from '@/components/interactive/actions-section';
import { FeedSection } from '@/components/interactive/feed-section';
import { ReelsSection } from '@/components/interactive/reels-section';
import { ActionInitiativeProgress } from '@/components/data/action-initiative-progress';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { AssistantDetailBanner } from '@/components/data/assistant-detail-banner';
import { FirstRioterBadge } from '@/components/data/first-rioter-badge';
import { ShareEligibilityBanner } from '@/components/interactive/share-eligibility-banner';
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
  const tF = await getTranslations('Follow');

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
  const [joined, followed, followerCount] = await Promise.all([
    userId ? hasJoinedIssue(userId, issue.id) : Promise.resolve(false),
    userId ? hasFollowedIssue(userId, issue.id) : Promise.resolve(false),
    getFollowerCount(issue.id),
  ]);

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
  const rawActions = await getActionsForIssue(issue.id);
  const actions = await translateActions(rawActions, locale);
  const actionCount = await getActionCountForIssue(issue.id);
  const health = await getCommunityHealth(issue.id);
  const rawExperts = await getExpertProfiles(issue.id);
  const experts = await translateExpertProfiles(rawExperts, locale);
  const feedPosts = await getFeedPosts(issue.id);
  const rawCountries = await getCountryBreakdown(issue.id);
  const countries = translateCountryBreakdown(rawCountries, locale);
  const rawSynonyms = await getSynonymsForIssue(issue.id);
  const synonyms = await translateSynonyms(rawSynonyms, locale);
  const rawReels = await getReelsForIssue(issue.id);
  const reels = await translateRiotReels(rawReels, locale);
  const rawActionInitiatives = await getActionInitiativesForIssue(issue.id);
  const actionInitiatives = await translateActionInitiatives(rawActionInitiatives, locale);
  const evidence = await getEvidenceForIssue(issue.id);
  const rawAssistant = await getAssistantByCategory(toAssistantCategory(issue.category));
  const assistant = rawAssistant ? await translateCategoryAssistant(rawAssistant, locale) : null;

  const sectionNavItems = [
    { id: 'overview', label: t('sectionOverview') },
    { id: 'actions', label: t('sectionActions') },
    { id: 'evidence', label: t('sectionEvidence') },
    { id: 'community', label: t('sectionCommunity') },
    { id: 'experts', label: t('sectionExperts') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero Image */}
      <HeroImage
        imageUrl={issue.hero_image_url}
        category={issue.category}
        categoryLabel={tc(issue.category)}
        title={issue.name}
        breadcrumbs={[
          { label: t('breadcrumb'), href: '/issues' },
          { label: tc(issue.category), href: `/issues?category=${issue.category}` },
          { label: issue.name },
        ]}
      >
        {/* Floating stats bar */}
        <div className="flex flex-wrap items-center gap-4">
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
          <StatBadge
            value={followerCount}
            label={tF('followers', { count: followerCount })}
            emoji="👁️"
          />
          <TrendingIndicator delta={issue.trending_delta} size="md" />
        </div>
      </HeroImage>

      {/* Pending review banner */}
      {issue.status === 'pending_review' && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {t('pendingBanner')}
          </p>
        </div>
      )}

      {/* Section navigation */}
      <SectionNav sections={sectionNavItems} />

      {/* Main content — 3 col on desktop */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2">
          {/* Overview section */}
          <section id="overview" className="mb-8">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">{issue.description}</p>

            {synonyms.length > 0 && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t('alsoKnownAs')}
                </p>
                <SynonymList synonyms={synonyms} issueId={issue.id} />
              </div>
            )}

            {/* The Pivot — THE killer feature */}
            <PivotToggle
              issuePivotRows={issuePivotRows}
              orgPivotRows={orgPivotRows}
              currentOrgId={firstOrg?.organisation_id}
              currentIssueId={issue.id}
              issueName={issue.name}
              orgName={firstOrg?.organisation_name}
            />
          </section>

          {/* Actions section */}
          <section id="actions" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('actionsTitle')}</h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('actionsDesc')}</p>
            <ActionsSection issueId={issue.id} initialActions={actions} />

            {actionInitiatives.length > 0 && (
              <div className="mt-6">
                <ActionInitiativeProgress actionInitiatives={actionInitiatives} />
              </div>
            )}
          </section>

          {/* Evidence section */}
          <section id="evidence" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('gatherEvidence')}</h2>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t('gatherEvidenceDesc')}
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
            <h2 className="mb-4 text-lg font-bold">{t('riotReels')}</h2>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('riotReelsDesc')}</p>
            <ReelsSection issueId={issue.id} initialReels={reels} />
          </section>

          {/* Community Feed */}
          <section id="community" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('communityFeed')}</h2>
            <FeedSection issueId={issue.id} initialPosts={feedPosts} />
          </section>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Join + Follow buttons */}
          <div className="space-y-2">
            <JoinButton issueId={issue.id} initialJoined={joined} />
            <FollowButton issueId={issue.id} initialFollowed={followed} />
          </div>

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

          {/* Experts */}
          <section id="experts">
            {experts.length > 0 && (
              <>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t('experts')}
                </h3>
                <div className="space-y-3">
                  {experts.map((expert) => (
                    <ExpertCard key={expert.id} expert={expert} />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* First Rioter badge */}
          {firstRioterUser && issue.status === 'active' && (
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
          )}

          {/* Assistant banner — at bottom of sidebar per user request */}
          {assistant && (
            <AssistantDetailBanner
              assistant={assistant}
              agentHelps={issue.agent_helps}
              humanHelps={issue.human_helps}
              focus={issue.agent_focus ?? assistant.focus}
            />
          )}

          {/* Share eligibility banner */}
          {userId && <ShareEligibilityBanner />}
        </div>
      </div>
    </div>
  );
}
