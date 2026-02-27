import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAllIssues, getIssueCountsByCategory } from '@/lib/queries/issues';
import { getAllAssistants } from '@/lib/queries/assistants';
import { translateEntities, translateCategoryAssistants } from '@/lib/queries/translate';
import { PageHeader } from '@/components/layout/page-header';
import { IssueCard } from '@/components/cards/issue-card';
import { SearchBar } from '@/components/interactive/search-bar';
import { CategoryFilter } from '@/components/interactive/category-filter';
import { AssistantBanner } from '@/components/data/assistant-banner';
import { AssistantOverviewBanner } from '@/components/data/assistant-overview-banner';
import { Link } from '@/i18n/navigation';
import type { Category } from '@/types';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function IssuesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Issues');

  const sp = await searchParams;
  const category = sp.category as Category | undefined;
  const search = sp.search || undefined;

  const [rawIssues, counts, rawAssistants] = await Promise.all([
    getAllIssues(category, search, undefined, locale),
    getIssueCountsByCategory(),
    getAllAssistants(),
  ]);
  const issues = await translateEntities(rawIssues, 'issue', locale);
  const allAssistants = await translateCategoryAssistants(rawAssistants, locale);
  const totalIssues = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const assistant = category
    ? allAssistants.find((a) => a.category.toLowerCase() === category.toLowerCase())
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: totalIssues, categoryCount: Object.keys(counts).length })}
      />

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

      {issues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-400">{t('noResults')}</p>
          {search && (
            <Link
              href={`/issues/suggest?q=${encodeURIComponent(search)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              ✊ {t('suggestNew')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
