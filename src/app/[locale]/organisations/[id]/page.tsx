import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getOrganisationById,
  getIssuesForOrg,
  getTotalRiotersForOrg,
  getOrgCommunityData,
} from '@/lib/queries/organisations';
import { getEvidenceForOrg } from '@/lib/queries/evidence';
import { getAssistantByCategory } from '@/lib/queries/assistants';
import {
  translateEntity,
  translateOrgPivotRows,
  translateCategoryAssistant,
  translateActions,
  translateExpertProfiles,
  translateRiotReels,
  translateCountryBreakdown,
} from '@/lib/queries/translate';
import { HeroImage } from '@/components/layout/hero-image';
import { SectionNav } from '@/components/layout/section-nav';
import { StatBadge } from '@/components/data/stat-badge';
import { HealthMeter } from '@/components/data/health-meter';
import { CountryList } from '@/components/data/country-list';
import { ExpertCard } from '@/components/cards/expert-card';
import { AssistantDetailBanner } from '@/components/data/assistant-detail-banner';
import { IssueList } from '@/components/data/issue-list';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { ActionsSection } from '@/components/interactive/actions-section';
import { FeedSection } from '@/components/interactive/feed-section';
import { ReelsSection } from '@/components/interactive/reels-section';
import { toAssistantCategory } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('OrgDetail');
  const tc = await getTranslations('Categories');

  const rawOrg = await getOrganisationById(id);
  if (!rawOrg) notFound();
  const org = await translateEntity(rawOrg, 'organisation', locale);

  // Load pivot data + community data in parallel
  const [rawOrgPivotRows, totalRioters, evidence, rawAssistant, communityData] = await Promise.all([
    getIssuesForOrg(org.id),
    getTotalRiotersForOrg(org.id),
    getEvidenceForOrg(org.id),
    getAssistantByCategory(toAssistantCategory(org.category)),
    getOrgCommunityData(org.id),
  ]);

  const firstIssue = rawOrgPivotRows[0];

  // Translate everything in parallel
  const [orgPivotRows, assistant, actions, experts, reels, countries] = await Promise.all([
    translateOrgPivotRows(rawOrgPivotRows, locale),
    rawAssistant ? translateCategoryAssistant(rawAssistant, locale) : Promise.resolve(null),
    translateActions(communityData.actions, locale),
    translateExpertProfiles(communityData.experts, locale),
    translateRiotReels(communityData.reels, locale),
    Promise.resolve(translateCountryBreakdown(communityData.countries, locale)),
  ]);

  const sectionNavItems = [
    { id: 'overview', label: t('sectionOverview') },
    { id: 'actions', label: t('sectionActions') },
    { id: 'evidence', label: t('sectionEvidence') },
    { id: 'community', label: t('sectionCommunity') },
    { id: 'experts', label: t('sectionExperts') },
    { id: 'reels', label: t('sectionReels') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero Image */}
      <HeroImage
        imageUrl={org.hero_image_url}
        category={org.category}
        categoryLabel={tc(org.category)}
        title={`${org.logo_emoji} ${org.name}`}
        breadcrumbs={[
          { label: t('breadcrumb'), href: '/organisations' },
          { label: tc(org.category), href: `/organisations?category=${org.category}` },
          { label: org.name },
        ]}
      >
        {/* Floating stats bar */}
        <div className="flex flex-wrap items-center gap-4">
          <StatBadge value={totalRioters} label={t('totalRioters')} emoji="📊" />
          <StatBadge value={orgPivotRows.length} label={t('issues')} emoji="📋" />
          <StatBadge
            value={
              orgPivotRows.length > 0 && totalRioters > 0
                ? Math.round((orgPivotRows[0].rioter_count / totalRioters) * 100) + '%'
                : '0%'
            }
            label={t('topIssueShare')}
            emoji="📈"
          />
        </div>
      </HeroImage>

      {/* Section navigation */}
      <SectionNav sections={sectionNavItems} />

      {/* Main content — 3 col on desktop */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2">
          {/* Overview section */}
          <section id="overview" className="mb-8">
            {org.description && (
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">{org.description}</p>
            )}

            {/* Issues list */}
            <IssueList rows={orgPivotRows} />
          </section>

          {/* Actions section */}
          <section id="actions" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('actionsTitle')}</h2>
            {actions.length > 0 ? (
              <ActionsSection issueId={firstIssue?.issue_id ?? ''} initialActions={actions} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noActions')}</p>
            )}
          </section>

          {/* Evidence section */}
          <section id="evidence" className="mb-8">
            {firstIssue && (
              <>
                <h2 className="mb-4 text-lg font-bold">{t('gatherEvidence')}</h2>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('gatherEvidenceDesc', { orgName: org.name })}
                </p>
                <EvidenceSection
                  issueId={firstIssue.issue_id}
                  initialEvidence={evidence}
                  organisations={[{ id: org.id, name: org.name }]}
                  preselectedOrgId={org.id}
                />
              </>
            )}
          </section>

          {/* Riot Reels */}
          <section id="reels" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('reelsTitle')}</h2>
            {reels.length > 0 && firstIssue ? (
              <ReelsSection issueId={firstIssue.issue_id} initialReels={reels} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noReels')}</p>
            )}
          </section>

          {/* Community Feed */}
          <section id="community" className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('feedTitle')}</h2>
            {communityData.feed.length > 0 && firstIssue ? (
              <FeedSection issueId={firstIssue.issue_id} initialPosts={communityData.feed} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noFeed')}</p>
            )}
          </section>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Community Health */}
          {communityData.health && (
            <section>
              <HealthMeter health={communityData.health} />
            </section>
          )}

          {/* Countries */}
          {countries.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('countriesTitle')}
              </h3>
              <CountryList countries={countries} />
            </section>
          )}

          {/* Experts */}
          <section id="experts">
            {experts.length > 0 ? (
              <>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t('expertsTitle')}
                </h3>
                <div className="space-y-3">
                  {experts.map((expert) => (
                    <ExpertCard key={expert.id} expert={expert} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noExperts')}</p>
            )}
          </section>

          {/* Assistant banner */}
          {assistant && <AssistantDetailBanner assistant={assistant} />}
        </div>
      </div>
    </div>
  );
}
