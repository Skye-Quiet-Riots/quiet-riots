'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ActionInitiativeStatus } from '@/types';

const STATUS_KEYS: {
  value: ActionInitiativeStatus | null;
  key: 'all' | 'active' | 'funded' | 'disbursed';
}[] = [
  { value: null, key: 'all' },
  { value: 'active', key: 'active' },
  { value: 'goal_reached', key: 'funded' },
  { value: 'delivered', key: 'disbursed' },
];

export function StatusFilter() {
  const t = useTranslations('Filter');
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('status') as ActionInitiativeStatus | null;

  function handleClick(status: ActionInitiativeStatus | null) {
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
      {STATUS_KEYS.map((s) => (
        <button
          key={s.key}
          onClick={() => handleClick(s.value)}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === s.value || (!active && !s.value)
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          {t(s.key)}
        </button>
      ))}
    </div>
  );
}
