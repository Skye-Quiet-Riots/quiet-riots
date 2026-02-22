'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CampaignStatus } from '@/types';

const STATUSES: { value: CampaignStatus | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'funded', label: 'Funded' },
  { value: 'disbursed', label: 'Disbursed' },
];

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('status') as CampaignStatus | null;

  function handleClick(status: CampaignStatus | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {STATUSES.map((s) => (
        <button
          key={s.label}
          onClick={() => handleClick(s.value)}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === s.value || (!active && !s.value)
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
