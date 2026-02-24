'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface TimeSkillFilterProps {
  onFilterChange: (filters: { time?: string; type?: string }) => void;
}

export function TimeSkillFilter({ onFilterChange }: TimeSkillFilterProps) {
  const t = useTranslations('TimeSkill');
  const [time, setTime] = useState<string>('');
  const [type, setType] = useState<string>('');

  function handleTimeChange(newTime: string) {
    const updated = newTime === time ? '' : newTime;
    setTime(updated);
    onFilterChange({ time: updated || undefined, type: type || undefined });
  }

  function handleTypeChange(newType: string) {
    const updated = newType === type ? '' : newType;
    setType(updated);
    onFilterChange({ time: time || undefined, type: updated || undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('timeQuestion')}
        </p>
        <div className="flex gap-2">
          {[
            { value: '1min', key: 'time1min' as const },
            { value: '10min', key: 'time10min' as const },
            { value: '1hr+', key: 'time1hour' as const },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTimeChange(opt.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                time === opt.value
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {t(opt.key)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('typeQuestion')}
        </p>
        <div className="flex gap-2">
          {[
            { value: 'idea', key: 'ideas' as const },
            { value: 'action', key: 'actions' as const },
            { value: 'together', key: 'together' as const },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                type === opt.value
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {t(opt.key)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
