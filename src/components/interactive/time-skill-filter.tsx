'use client';

import { useState } from 'react';

interface TimeSkillFilterProps {
  onFilterChange: (filters: { time?: string; type?: string }) => void;
}

export function TimeSkillFilter({ onFilterChange }: TimeSkillFilterProps) {
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
          How much time do you have?
        </p>
        <div className="flex gap-2">
          {[
            { value: '1min', label: '1 min' },
            { value: '10min', label: '10 min' },
            { value: '1hr+', label: '1 hour+' },
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
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          What type?
        </p>
        <div className="flex gap-2">
          {[
            { value: 'idea', label: '💡 Ideas' },
            { value: 'action', label: '⚡ Actions' },
            { value: 'together', label: '🤝 Together' },
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
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
