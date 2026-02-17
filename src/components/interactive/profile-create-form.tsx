'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileCreateForm() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), email: formEmail.trim() }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h1 className="mb-2 text-2xl font-bold">Create your profile</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Join Quiet Riots to track your issues, take actions, and connect with others.
      </p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
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
          {creating ? 'Creating...' : 'Join Quiet Riots'}
        </button>
      </form>
    </div>
  );
}
