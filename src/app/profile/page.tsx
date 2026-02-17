'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CategoryBadge } from '@/components/data/category-badge';
import type { Category } from '@/types';

interface UserData {
  user: {
    id: number;
    name: string;
    email: string;
    time_available: string;
    skills: string;
  };
  issues: {
    issue_id: number;
    issue_name?: string;
    name?: string;
    category: Category;
    rioter_count: number;
  }[];
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state for creating profile
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      // Try to get current user from cookie session
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch {
      // No session
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), email: formEmail.trim() }),
      });
      if (res.ok) {
        await fetchProfile();
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h1 className="mb-2 text-2xl font-bold">Create your profile</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Join Quiet Riots to track your issues, take actions, and connect with others.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {creating ? 'Creating...' : '✊ Join Quiet Riots'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { user, issues } = userData;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Time: </span>
            <span className="font-medium">{user.time_available}</span>
          </div>
          {user.skills && (
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Skills: </span>
              <span className="font-medium">{user.skills}</span>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-bold">✊ Your Quiet Riots</h2>
      {issues.length > 0 ? (
        <div className="space-y-3">
          {issues.map((item) => (
            <Link
              key={item.issue_id}
              href={`/issues/${item.issue_id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div>
                <span className="font-semibold">{item.issue_name || item.name}</span>
                <div className="mt-1">
                  <CategoryBadge category={item.category} />
                </div>
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {item.rioter_count.toLocaleString()} rioters
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-2 text-zinc-600 dark:text-zinc-400">
            You haven&apos;t joined any Quiet Riots yet.
          </p>
          <Link
            href="/issues"
            className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Browse issues →
          </Link>
        </div>
      )}
    </div>
  );
}
