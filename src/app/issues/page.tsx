import { Suspense } from 'react';
import { getAllIssues, getIssueCountsByCategory } from '@/lib/queries/issues';
import { getAllAssistants } from '@/lib/queries/assistants';
import { PageHeader } from '@/components/layout/page-header';
import { IssueCard } from '@/components/cards/issue-card';
import { SearchBar } from '@/components/interactive/search-bar';
import { CategoryFilter } from '@/components/interactive/category-filter';
import { AssistantBanner } from '@/components/data/assistant-banner';
import type { Category } from '@/types';

interface Props {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function IssuesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category as Category | undefined;
  const search = params.search || undefined;

  const [issues, counts, allAssistants] = await Promise.all([
    getAllIssues(category, search),
    getIssueCountsByCategory(),
    category ? getAllAssistants() : Promise.resolve([]),
  ]);
  const totalIssues = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const assistant = category
    ? allAssistants.find((a) => a.category === category.toLowerCase())
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Issues"
        subtitle={`${totalIssues} issues across ${Object.keys(counts).length} categories. Find yours.`}
      />

      <div className="mb-6 space-y-4">
        <Suspense>
          <SearchBar placeholder="Search issues or synonyms..." />
        </Suspense>
        <Suspense>
          <CategoryFilter />
        </Suspense>
      </div>

      {assistant && (
        <div className="mb-6">
          <AssistantBanner assistant={assistant} />
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
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            No issues found. Try a different search or category.
          </p>
        </div>
      )}
    </div>
  );
}
