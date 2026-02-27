import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getActionInitiativesWithIssues } from '@/lib/queries/action-initiatives';
import { translateActionInitiatives } from '@/lib/queries/translate';
import { getTranslatedEntities } from '@/lib/queries/translations';
import { PageHeader } from '@/components/layout/page-header';
import { ActionInitiativeCard } from '@/components/cards/action-initiative-card';
import { StatusFilter } from '@/components/interactive/status-filter';
import type { ActionInitiativeStatus } from '@/types';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function ActionInitiativesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ActionInitiatives');

  const sp = await searchParams;
  const status = sp.status as ActionInitiativeStatus | undefined;

  const rawActionInitiatives = await getActionInitiativesWithIssues(status);

  // Translate action initiative titles/descriptions and issue names
  let actionInitiatives = await translateActionInitiatives(rawActionInitiatives, locale);
  if (locale !== 'en' && actionInitiatives.length > 0) {
    const issueIds = [...new Set(actionInitiatives.map((ai) => ai.issue_id))];
    const issueTranslations = await getTranslatedEntities('issue', issueIds, locale);
    actionInitiatives = actionInitiatives.map((ai) => {
      const tr = issueTranslations[ai.issue_id];
      return tr?.name ? { ...ai, issue_name: tr.name } : ai;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: actionInitiatives.length })}
      />

      <div className="mb-6">
        <Suspense>
          <StatusFilter />
        </Suspense>
      </div>

      {actionInitiatives.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {actionInitiatives.map((actionInitiative) => (
            <ActionInitiativeCard
              key={actionInitiative.id}
              actionInitiative={actionInitiative}
              issueName={actionInitiative.issue_name}
              issueCategory={actionInitiative.issue_category}
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
