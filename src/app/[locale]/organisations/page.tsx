import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getAllOrganisations,
  getIssueCountForOrg,
  getTotalRiotersForOrg,
} from '@/lib/queries/organisations';
import { getAllAssistants } from '@/lib/queries/assistants';
import { translateEntities, translateCategoryAssistants } from '@/lib/queries/translate';
import { PageHeader } from '@/components/layout/page-header';
import { OrgCard } from '@/components/cards/org-card';
import { SearchBar } from '@/components/interactive/search-bar';
import { CategoryFilter } from '@/components/interactive/category-filter';
import { AssistantBanner } from '@/components/data/assistant-banner';
import { AssistantOverviewBanner } from '@/components/data/assistant-overview-banner';
import type { Category } from '@/types';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function OrganisationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Organisations');

  const sp = await searchParams;
  const category = sp.category as Category | undefined;
  const search = sp.search || undefined;
  const [rawOrgs, rawAssistants] = await Promise.all([
    getAllOrganisations(category, search, locale),
    getAllAssistants(),
  ]);
  const orgs = await translateEntities(rawOrgs, 'organisation', locale);
  const allAssistants = await translateCategoryAssistants(rawAssistants, locale);
  const assistant = category
    ? allAssistants.find((a) => a.category.toLowerCase() === category.toLowerCase())
    : undefined;

  // Pre-fetch counts for all orgs in parallel
  const orgData = await Promise.all(
    orgs.map(async (org) => ({
      org,
      issueCount: await getIssueCountForOrg(org.id),
      totalRioters: await getTotalRiotersForOrg(org.id),
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mb-6 space-y-4">
        <Suspense>
          <SearchBar placeholder={t('searchPlaceholder')} />
        </Suspense>
        <Suspense>
          <CategoryFilter />
        </Suspense>
      </div>

      {assistant ? (
        <div className="mb-6">
          <AssistantBanner assistant={assistant} />
        </div>
      ) : (
        <div className="mb-6">
          <AssistantOverviewBanner assistants={allAssistants} />
        </div>
      )}

      {orgData.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {orgData.map(({ org, issueCount, totalRioters }) => (
            <OrgCard key={org.id} org={org} issueCount={issueCount} totalRioters={totalRioters} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-zinc-500 dark:text-zinc-400">{t('noResults')}</p>
        </div>
      )}
    </div>
  );
}
