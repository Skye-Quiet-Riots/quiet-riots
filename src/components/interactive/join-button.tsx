'use client';

import { useState } from 'react';

interface JoinButtonProps {
  issueId: number;
  initialJoined: boolean;
}

export function JoinButton({ issueId, initialJoined }: JoinButtonProps) {
  const [joined, setJoined] = useState(initialJoined);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}/join`, {
        method: joined ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        setJoined(!joined);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
        joined
          ? 'border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
      }`}
    >
      {loading ? '...' : joined ? '✅ Joined this Quiet Riot' : '✊ Join this Quiet Riot'}
    </button>
  );
}
