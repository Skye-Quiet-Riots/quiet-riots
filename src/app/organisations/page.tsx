import { Suspense } from 'react';
import {
  getAllOrganisations,
  getIssueCountForOrg,
  getTotalRiotersForOrg,
} from '@/lib/queries/organisations';
import { getAllAssistants } from '@/lib/queries/assistants';
import { PageHeader } from '@/components/layout/page-header';
import { OrgCard } from '@/components/cards/org-card';
import { CategoryFilter } from '@/components/interactive/category-filter';
import { AssistantBanner } from '@/components/data/assistant-banner';
import type { Category } from '@/types';

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function OrganisationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category as Category | undefined;
  const [orgs, allAssistants] = await Promise.all([
    getAllOrganisations(category),
    category ? getAllAssistants() : Promise.resolve([]),
  ]);
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
      <PageHeader
        title="Organisations"
        subtitle="Browse organisations and see what issues people have with each."
      />

      <div className="mb-6">
        <Suspense>
          <CategoryFilter />
        </Suspense>
      </div>

      {assistant && (
        <div className="mb-6">
          <AssistantBanner assistant={assistant} />
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
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            No organisations found for this category.
          </p>
        </div>
      )}
    </div>
  );
}
