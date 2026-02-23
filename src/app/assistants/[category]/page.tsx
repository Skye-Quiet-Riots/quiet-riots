import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAssistantDetail } from '@/lib/queries/assistants';
import { PageHeader } from '@/components/layout/page-header';
import { AssistantProfile } from '@/components/data/assistant-profile';
import { AssistantActivityList } from '@/components/data/assistant-activity-list';
import { StatBadge } from '@/components/data/stat-badge';
import { CategoryBadge } from '@/components/data/category-badge';
import { ClaimForm } from '@/components/interactive/claim-form';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory, Category } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ category: string }>;
}

export default async function AssistantDetailPage({ params }: Props) {
  const { category } = await params;

  if (!ASSISTANT_CATEGORIES.includes(category as AssistantCategory)) {
    notFound();
  }

  const detail = await getAssistantDetail(category);
  if (!detail) notFound();

  const displayCategory = (category.charAt(0).toUpperCase() +
    category.slice(1)) as Category;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={`${detail.agent_name} & ${detail.human_name}`}
        subtitle={detail.goal || undefined}
        breadcrumbs={[
          { label: 'Assistants', href: '/assistants' },
          { label: displayCategory },
        ]}
      />

      {/* Category badge */}
      <div className="mb-6">
        <CategoryBadge category={displayCategory} size="md" />
      </div>

      {/* Dual profile cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <AssistantProfile
          name={detail.agent_name}
          icon={detail.agent_icon}
          roleLabel="AI Agent"
          quote={detail.agent_quote}
          bio={detail.agent_bio}
          gradientStart={detail.agent_gradient_start}
          gradientEnd={detail.agent_gradient_end}
        />
        <AssistantProfile
          name={detail.human_name}
          icon={detail.human_icon}
          roleLabel="Human Organiser"
          quote={detail.human_quote}
          bio={detail.human_bio}
          gradientStart={detail.human_gradient_start}
          gradientEnd={detail.human_gradient_end}
        />
      </div>

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatBadge
          value={detail.rioter_count}
          label="rioters"
        />
        <StatBadge
          value={detail.riot_count}
          label={detail.riot_count === 1 ? 'riot' : 'riots'}
        />
        <StatBadge
          value={detail.messages_sent}
          label="messages"
        />
      </div>

      {/* Focus section */}
      {detail.focus && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Current Focus
          </h2>
          <p className="font-medium">{detail.focus}</p>
          {detail.focus_detail && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {detail.focus_detail}
            </p>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Recent Activity</h2>
        <AssistantActivityList activities={detail.recent_activity} />
      </div>

      {/* Riots we help with */}
      {detail.riots.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Quiet Riots We Help With</h2>
          <div className="space-y-3">
            {detail.riots.map((riot) => (
              <Link
                key={riot.id}
                href={`/issues/${riot.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{riot.name}</h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {riot.rioter_count.toLocaleString()} rioters
                  </span>
                </div>
                {riot.agent_helps && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{detail.agent_name}:</span>{' '}
                    {riot.agent_helps}
                  </p>
                )}
                {riot.human_helps && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{detail.human_name}:</span>{' '}
                    {riot.human_helps}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Express Interest banner */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-800 dark:bg-purple-900/20">
        <h2 className="mb-1 text-lg font-bold text-purple-800 dark:text-purple-300">
          Want to be {detail.human_name}?
        </h2>
        <p className="mb-3 text-sm text-purple-700 dark:text-purple-400">
          The human organiser role is open to anyone with passion for this category. Express
          your interest below.
        </p>
        <ClaimForm
          category={detail.category}
          humanName={detail.human_name}
        />
      </div>
    </div>
  );
}
