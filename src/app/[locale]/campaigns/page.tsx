import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCampaignsWithIssues } from '@/lib/queries/campaigns';
import { getTranslatedEntities } from '@/lib/queries/translations';
import { PageHeader } from '@/components/layout/page-header';
import { CampaignCard } from '@/components/cards/campaign-card';
import { StatusFilter } from '@/components/interactive/status-filter';
import type { CampaignStatus } from '@/types';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function CampaignsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Campaigns');

  const sp = await searchParams;
  const status = sp.status as CampaignStatus | undefined;

  const rawCampaigns = await getCampaignsWithIssues(status);

  // Translate issue names shown alongside campaigns
  let campaigns = rawCampaigns;
  if (locale !== 'en' && rawCampaigns.length > 0) {
    const issueIds = [...new Set(rawCampaigns.map((c) => c.issue_id))];
    const issueTranslations = await getTranslatedEntities('issue', issueIds, locale);
    campaigns = rawCampaigns.map((c) => {
      const t = issueTranslations[c.issue_id];
      return t?.name ? { ...c, issue_name: t.name } : c;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: campaigns.length })} />

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
          <p className="text-lg text-zinc-500 dark:text-zinc-400">{t('noResults')}</p>
        </div>
      )}
    </div>
  );
}
