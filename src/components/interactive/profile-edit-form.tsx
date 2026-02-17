'use client';

import { useState } from 'react';

interface ProfileEditFormProps {
  userId: number;
  initialName: string;
  initialTimeAvailable: string;
  initialSkills: string;
}

const TIME_OPTIONS = [
  { value: '1min', label: '1 minute', description: 'Quick actions only' },
  { value: '10min', label: '10 minutes', description: 'Most actions' },
  { value: '1hr+', label: '1 hour+', description: 'Deep involvement' },
];

export function ProfileEditForm({
  userId,
  initialName,
  initialTimeAvailable,
  initialSkills,
}: ProfileEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [timeAvailable, setTimeAvailable] = useState(initialTimeAvailable);
  const [skills, setSkills] = useState(initialSkills);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          time_available: timeAvailable,
          skills: skills.trim(),
        }),
      });
      if (res.ok) {
        setEditing(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(initialName);
    setTimeAvailable(initialTimeAvailable);
    setSkills(initialSkills);
    setError('');
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
      >
        Edit profile
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div>
        <label htmlFor="edit-name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>
      <div>
        <label htmlFor="edit-time" className="mb-1 block text-sm font-medium">
          Time available
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeAvailable(opt.value)}
              className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                timeAvailable === opt.value
                  ? 'border-purple-500 bg-purple-50 font-medium text-purple-700 dark:border-purple-600 dark:bg-purple-900/20 dark:text-purple-300'
                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
              }`}
            >
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="edit-skills" className="mb-1 block text-sm font-medium">
          Skills
        </label>
        <input
          id="edit-skills"
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. design, writing, legal, coding"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Comma-separated. Helps match you with relevant actions.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
