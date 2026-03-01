import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getIssueById } from '@/lib/queries/issues';
import { getOrganisationById, getIssueOrgIntersection } from '@/lib/queries/organisations';
import { getEvidenceForIssue, getEvidenceCountForIssue } from '@/lib/queries/evidence';
import { getFeedPosts } from '@/lib/queries/community';
import { hasJoinedIssue, hasFollowedIssue } from '@/lib/queries/users';
import { translateEntity } from '@/lib/queries/translate';
import { getSession } from '@/lib/session';
import { HeroImage } from '@/components/layout/hero-image';
import { StatBadge } from '@/components/data/stat-badge';
import { JoinButton } from '@/components/interactive/join-button';
import { FollowButton } from '@/components/interactive/follow-button';
import { EvidenceSection } from '@/components/interactive/evidence-section';
import { FeedSection } from '@/components/interactive/feed-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string; id: string; orgId: string }>;
}

export default async function IssueOrgIntersectionPage({ params }: Props) {
  const { locale, id: issueId, orgId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('IssueOrgIntersection');
  const tc = await getTranslations('Categories');

  // Load issue, org, and intersection in parallel
  const [rawIssue, rawOrg, intersection] = await Promise.all([
    getIssueById(issueId),
    getOrganisationById(orgId),
    getIssueOrgIntersection(issueId, orgId),
  ]);

  // 404 if any part is missing or intersection doesn't exist
  if (!rawIssue || !rawOrg || !intersection) notFound();
  if (rawIssue.status !== 'active') notFound();

  // Translate entity names
  const [issue, org] = await Promise.all([
    translateEntity(rawIssue, 'issue', locale),
    translateEntity(rawOrg, 'organisation', locale),
  ]);

  const userId = await getSession();

  // Load remaining data in parallel
  const [evidence, evidenceCount, feedPosts, joined, followed] = await Promise.all([
    getEvidenceForIssue(issueId, orgId),
    getEvidenceCountForIssue(issueId),
    getFeedPosts(issueId),
    userId ? hasJoinedIssue(userId, issueId) : Promise.resolve(false),
    userId ? hasFollowedIssue(userId, issueId) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero Image */}
      <HeroImage
        imageUrl={issue.hero_image_url}
        category={issue.category}
        categoryLabel={tc(issue.category)}
        title={t('title', { issueName: issue.name, orgName: org.name })}
        breadcrumbs={[
          { label: t('breadcrumbIssues'), href: '/issues' },
          { label: tc(issue.category), href: `/issues?category=${issue.category}` },
          { label: issue.name, href: `/issues/${issue.id}` },
          { label: org.name },
        ]}
      >
        {/* Floating stats */}
        <div className="flex flex-wrap items-center gap-4">
          <StatBadge
            value={intersection.rioter_count}
            label={t('rioters', { count: intersection.rioter_count })}
            emoji="📊"
          />
          <StatBadge
            value={`#${intersection.rank}`}
            label={t('paretoRank', { rank: intersection.rank })}
            emoji="🏆"
          />
          <StatBadge
            value={evidenceCount}
            label={t('evidenceCount', { count: evidenceCount })}
            emoji="📹"
          />
        </div>
      </HeroImage>

      {/* Back links */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/issues/${issue.id}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← {t('backToIssue', { issueName: issue.name })}
        </Link>
        <Link
          href={`/organisations/${org.id}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← {t('backToOrg', { orgName: org.name })}
        </Link>
      </div>

      {/* Main content — 3 col on desktop */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2">
          {/* Evidence section — scoped to this org */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{t('evidenceTitle')}</h2>
            {evidence.length > 0 ? (
              <EvidenceSection
                issueId={issue.id}
                initialEvidence={evidence}
                organisations={[{ id: org.id, name: org.name }]}
              />
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-zinc-500 dark:text-zinc-400">{t('noEvidence')}</p>
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                  {t('joinToContribute')}
                </p>
              </div>
            )}
          </section>

          {/* Community feed — issue-scoped (feed table has no org_id) */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold">
              {t('feedTitle')}
            </h2>
            {feedPosts.length > 0 ? (
              <FeedSection issueId={issue.id} initialPosts={feedPosts} />
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-zinc-500 dark:text-zinc-400">{t('noFeed')}</p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Join + Follow buttons */}
          <div className="space-y-2">
            <JoinButton issueId={issue.id} initialJoined={joined} />
            <FollowButton issueId={issue.id} initialFollowed={followed} />
          </div>

          {/* Stats card */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('statsTitle')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {t('rioters', { count: intersection.rioter_count })}
                </span>
                <span className="font-medium">{intersection.rioter_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {t('paretoRank', { rank: intersection.rank })}
                </span>
                <span className="font-medium">#{intersection.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {t('evidenceCount', { count: evidenceCount })}
                </span>
                <span className="font-medium">{evidenceCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
