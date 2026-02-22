import type { Campaign } from '@/types';
import { formatPence } from '@/lib/format';

interface CampaignProgressProps {
  campaigns: Campaign[];
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

export function CampaignProgress({ campaigns }: CampaignProgressProps) {
  if (campaigns.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        💰 Campaigns
      </h3>

      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const pct = Math.min(
            100,
            Math.round((campaign.raised_pence / campaign.target_pence) * 100),
          );
          const badge = getStatusBadge(campaign.status);

          return (
            <div key={campaign.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{campaign.title}</span>
                {badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              {campaign.description && (
                <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {campaign.description}
                </p>
              )}

              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {formatPence(campaign.raised_pence)} of {formatPence(campaign.target_pence)} (
                  {pct}
                  %)
                </span>
                <span>
                  {campaign.contributor_count}{' '}
                  {campaign.contributor_count === 1 ? 'backer' : 'backers'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
