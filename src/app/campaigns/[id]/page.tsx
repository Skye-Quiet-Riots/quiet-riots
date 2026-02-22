import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { getCampaignById } from '@/lib/queries/campaigns';
import { getIssueById } from '@/lib/queries/issues';
import { getWalletByUserId } from '@/lib/queries/wallet';
import { formatPence } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryBadge } from '@/components/data/category-badge';
import { StatBadge } from '@/components/data/stat-badge';
import { ContributeForm } from '@/components/interactive/contribute-form';

interface Props {
  params: Promise<{ id: string }>;
}

function getStatusDisplay(status: string): { label: string; className: string } {
  switch (status) {
    case 'funded':
      return {
        label: 'Fully Funded',
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      };
    case 'disbursed':
      return {
        label: 'Funds Disbursed',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      };
    default:
      return {
        label: 'Active',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      };
  }
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [issue, userId] = await Promise.all([getIssueById(campaign.issue_id), getSession()]);

  const wallet = userId ? await getWalletByUserId(userId) : null;
  const pct = Math.min(100, Math.round((campaign.raised_pence / campaign.target_pence) * 100));
  const statusDisplay = getStatusDisplay(campaign.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={campaign.title}
        breadcrumbs={[{ label: 'Campaigns', href: '/campaigns' }, { label: campaign.title }]}
      />

      {/* Issue link */}
      {issue && (
        <div className="mb-4 flex items-center gap-2">
          <CategoryBadge category={issue.category} size="sm" />
          <Link
            href={`/issues/${issue.id}`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            {issue.name}
          </Link>
        </div>
      )}

      {/* Status badge */}
      <div className="mb-4">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusDisplay.className}`}
        >
          {statusDisplay.label}
        </span>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">{campaign.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {formatPence(campaign.raised_pence)} raised of {formatPence(campaign.target_pence)} target (
        {pct}%)
      </p>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge value={formatPence(campaign.target_pence)} label="target" />
        <StatBadge value={formatPence(campaign.raised_pence)} label="raised" />
        <StatBadge
          value={campaign.contributor_count}
          label={campaign.contributor_count === 1 ? 'backer' : 'backers'}
        />
        <StatBadge value={`${campaign.platform_fee_pct}%`} label="platform fee" />
      </div>

      {/* Contribute form or status message */}
      {campaign.status === 'active' ? (
        wallet ? (
          <div className="mb-8">
            <ContributeForm
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              userBalance={wallet.balance_pence}
            />
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-2 text-sm font-semibold">Want to contribute?</p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {userId
                ? 'Top up your wallet first to start contributing.'
                : 'Create an account and load your wallet to support this campaign.'}
            </p>
            <Link
              href={userId ? '/wallet' : '/profile'}
              className="inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {userId ? 'Go to wallet' : 'Create account'}
            </Link>
          </div>
        )
      ) : (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This campaign has been {campaign.status}. Thank you to all {campaign.contributor_count}{' '}
            backers!
          </p>
        </div>
      )}

      {/* Recipient */}
      {campaign.recipient && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recipient
          </h3>
          {campaign.recipient_url ? (
            <a
              href={campaign.recipient_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {campaign.recipient}
            </a>
          ) : (
            <p className="text-sm font-medium">{campaign.recipient}</p>
          )}
        </div>
      )}
    </div>
  );
}
