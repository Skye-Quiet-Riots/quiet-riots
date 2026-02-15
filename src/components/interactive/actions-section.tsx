'use client';

import { useState, useEffect } from 'react';
import type { Action } from '@/types';
import { ActionCard } from '@/components/cards/action-card';
import { TimeSkillFilter } from '@/components/interactive/time-skill-filter';

interface ActionsSectionProps {
  issueId: number;
  initialActions: Action[];
}

export function ActionsSection({ issueId, initialActions }: ActionsSectionProps) {
  const [actions, setActions] = useState(initialActions);
  const [filters, setFilters] = useState<{ time?: string; type?: string }>({});

  useEffect(() => {
    async function fetchFiltered() {
      const params = new URLSearchParams();
      if (filters.time) params.set('time', filters.time);
      if (filters.type) params.set('type', filters.type);

      const res = await fetch(`/api/issues/${issueId}/actions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    }

    if (filters.time || filters.type) {
      fetchFiltered();
    } else {
      setActions(initialActions);
    }
  }, [filters, issueId, initialActions]);

  const ideas = actions.filter((a) => a.type === 'idea');
  const actionItems = actions.filter((a) => a.type === 'action');
  const together = actions.filter((a) => a.type === 'together');

  return (
    <div>
      <TimeSkillFilter onFilterChange={setFilters} />

      <div className="mt-4 space-y-6">
        {ideas.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-bold text-amber-600 dark:text-amber-400">
              💡 Ideas (Variation)
            </h4>
            <div className="space-y-2">
              {ideas.map((a) => <ActionCard key={a.id} action={a} />)}
            </div>
          </div>
        )}

        {actionItems.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-bold text-blue-600 dark:text-blue-400">
              ⚡ Actions (Selection)
            </h4>
            <div className="space-y-2">
              {actionItems.map((a) => <ActionCard key={a.id} action={a} />)}
            </div>
          </div>
        )}

        {together.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-bold text-green-600 dark:text-green-400">
              🤝 Together (Community)
            </h4>
            <div className="space-y-2">
              {together.map((a) => <ActionCard key={a.id} action={a} />)}
            </div>
          </div>
        )}

        {actions.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No actions match your filters. Try broadening your selection.
          </p>
        )}
      </div>
    </div>
  );
}
