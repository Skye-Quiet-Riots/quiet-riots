'use client';

import { useState } from 'react';
import type { Synonym } from '@/types';

interface SynonymListProps {
  synonyms: Synonym[];
  issueId: number;
}

export function SynonymList({ synonyms, issueId }: SynonymListProps) {
  const [items, setItems] = useState(synonyms);
  const [newTerm, setNewTerm] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.trim()) return;
    setAdding(true);

    try {
      const res = await fetch(`/api/issues/${issueId}/synonyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: newTerm.trim() }),
      });
      if (res.ok) {
        const synonym = await res.json();
        setItems([...items, synonym]);
        setNewTerm('');
      }
    } finally {
      setAdding(false);
    }
  }

  if (items.length === 0 && !adding) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s.id}
            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {s.term}
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-2 flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="Add a synonym..."
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={adding || !newTerm.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add
        </button>
      </form>
    </div>
  );
}
