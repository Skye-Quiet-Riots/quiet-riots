import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getOrganisationById,
  getIssuesForOrg,
  getOrgsForIssue,
  getTotalRiotersForOrg,
} from '@/lib/queries/organisations';
import { getEvidenceForOrg } from '@/lib/queries/evidence';
import { getAssistantByCategory } from '@/lib/queries/assistants';
import {
  translateEntity,
  translateIssuePivotRows,
  translateOrgPivotRows,
  translateCategoryAssistant,
} from '@/lib/queries/translate';
import { HeroImage } from '@/components/layout/hero-image';
import { StatBadge } from '@/components/data/stat-badge';
import { AssistantDetailBanner } from '@/components/data/assistant-detail-banner';
import { PivotToggle } from '@/components/interactive/pivot-toggle';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { toAssistantCategory } from '@/types';

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

  const rawOrgPivotRows = await getIssuesForOrg(org.id);
  const firstIssue = rawOrgPivotRows[0];
  const rawIssuePivotRows = firstIssue ? await getOrgsForIssue(firstIssue.issue_id) : [];
  const [orgPivotRows, issuePivotRows] = await Promise.all([
    translateOrgPivotRows(rawOrgPivotRows, locale),
    translateIssuePivotRows(rawIssuePivotRows, locale),
  ]);
  const totalRioters = await getTotalRiotersForOrg(org.id);
  const evidence = await getEvidenceForOrg(org.id);
  const rawAssistant = await getAssistantByCategory(toAssistantCategory(org.category));
  const assistant = rawAssistant ? await translateCategoryAssistant(rawAssistant, locale) : null;

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
              orgPivotRows.length > 0
                ? Math.round((orgPivotRows[0].rioter_count / totalRioters) * 100) + '%'
                : '0%'
            }
            label={t('topIssueShare')}
            emoji="📈"
          />
        </div>
      </HeroImage>

      {/* Main content — 3 col on desktop */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2">
          {org.description && (
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">{org.description}</p>
          )}

          {/* Pareto explanation */}
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>{t('paretoTitle')}</strong> {t('paretoDesc')}
            </p>
          </div>

          {/* The Pivot */}
          <section className="mb-8">
            <PivotToggle
              issuePivotRows={issuePivotRows}
              orgPivotRows={orgPivotRows}
              currentOrgId={org.id}
              currentIssueId={firstIssue?.issue_id}
              issueName={firstIssue?.issue_name}
              orgName={org.name}
            />
          </section>

          {/* Gather Evidence */}
          {firstIssue && (
            <section className="mb-8">
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
            </section>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Assistant banner */}
          {assistant && <AssistantDetailBanner assistant={assistant} />}
        </div>
      </div>
    </div>
  );
}
