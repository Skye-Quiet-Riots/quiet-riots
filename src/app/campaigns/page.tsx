import { Suspense } from 'react';
import { getCampaignsWithIssues } from '@/lib/queries/campaigns';
import { PageHeader } from '@/components/layout/page-header';
import { CampaignCard } from '@/components/cards/campaign-card';
import { StatusFilter } from '@/components/interactive/status-filter';
import type { CampaignStatus } from '@/types';

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function CampaignsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status as CampaignStatus | undefined;

  const campaigns = await getCampaignsWithIssues(status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Campaigns"
        subtitle={`${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} raising funds for change.`}
      />

      <div className="mb-6">
        <Suspense>
          <StatusFilter />
        </Suspense>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              issueName={campaign.issue_name}
              issueCategory={campaign.issue_category}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            No campaigns found. Try a different filter.
          </p>
        </div>
      )}
    </div>
  );
}
