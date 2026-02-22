import Link from 'next/link';
import { formatPence } from '@/lib/format';
import { CategoryBadge } from '@/components/data/category-badge';
import type { Campaign, Category } from '@/types';

interface CampaignCardProps {
  campaign: Campaign;
  issueName?: string;
  issueCategory?: Category;
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 60) return 'bg-blue-500';
  return 'bg-amber-500';
}

function getStatusBadge(status: string): { label: string; className: string } | null {
  if (status === 'funded') {
    return {
      label: 'Funded',
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    };
  }
  if (status === 'disbursed') {
    return {
      label: 'Disbursed',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    };
  }
  return null;
}

export function CampaignCard({ campaign, issueName, issueCategory }: CampaignCardProps) {
  const pct = Math.min(100, Math.round((campaign.raised_pence / campaign.target_pence) * 100));
  const badge = getStatusBadge(campaign.status);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {campaign.title}
        </h3>
        {badge && (
          <span
            className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {issueName && (
        <div className="mb-2 flex items-center gap-1.5">
          {issueCategory && <CategoryBadge category={issueCategory} size="sm" />}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{issueName}</span>
        </div>
      )}

      <div className="mb-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {formatPence(campaign.raised_pence)} of {formatPence(campaign.target_pence)} ({pct}%)
        </span>
        <span>
          {campaign.contributor_count} {campaign.contributor_count === 1 ? 'backer' : 'backers'}
        </span>
      </div>
    </Link>
  );
}
