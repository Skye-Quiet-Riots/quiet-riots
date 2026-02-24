import { notFound } from 'next/navigation';
import {
  getOrganisationById,
  getIssuesForOrg,
  getOrgsForIssue,
  getTotalRiotersForOrg,
} from '@/lib/queries/organisations';
import { getEvidenceForOrg } from '@/lib/queries/evidence';
import { getAssistantByCategory } from '@/lib/queries/assistants';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryBadge } from '@/components/data/category-badge';
import { StatBadge } from '@/components/data/stat-badge';
import { AssistantDetailBanner } from '@/components/data/assistant-detail-banner';
import { PivotToggle } from '@/components/interactive/pivot-toggle';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { toAssistantCategory } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
  const { id } = await params;
  const org = await getOrganisationById(id);
  if (!org) notFound();

  const orgPivotRows = await getIssuesForOrg(org.id);
  const firstIssue = orgPivotRows[0];
  const issuePivotRows = firstIssue ? await getOrgsForIssue(firstIssue.issue_id) : [];
  const totalRioters = await getTotalRiotersForOrg(org.id);
  const evidence = await getEvidenceForOrg(org.id);
  const assistant = await getAssistantByCategory(toAssistantCategory(org.category));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={`${org.logo_emoji} ${org.name}`}
        breadcrumbs={[
          { label: 'Organisations', href: '/organisations' },
          { label: org.category, href: `/organisations?category=${org.category}` },
          { label: org.name },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CategoryBadge category={org.category} size="md" />
      </div>

      {/* Assistants */}
      {assistant && (
        <div className="mb-6">
          <AssistantDetailBanner assistant={assistant} />
        </div>
      )}

      {org.description && (
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">{org.description}</p>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBadge value={totalRioters} label="total rioters" emoji="📊" />
        <StatBadge value={orgPivotRows.length} label="issues" emoji="📋" />
        <StatBadge
          value={
            orgPivotRows.length > 0
              ? Math.round((orgPivotRows[0].rioter_count / totalRioters) * 100) + '%'
              : '0%'
          }
          label="top issue share"
          emoji="📈"
        />
      </div>

      {/* Pareto explanation */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Pareto Principle:</strong> A handful of issues typically account for 80% of all
          complaints. The top issues below are ranked by the number of people affected.
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
          <h2 className="mb-4 text-lg font-bold">📹 Gather Evidence</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Document what&apos;s happening with {org.name}.
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
  );
}
