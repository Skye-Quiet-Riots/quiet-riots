'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ProfileEditFormProps {
  userId: string;
  initialName: string;
  initialTimeAvailable: string;
  initialSkills: string;
}

const TIME_OPTION_KEYS = [
  { value: '1min', labelKey: 'time1min' as const, descKey: 'time1minDesc' as const },
  { value: '10min', labelKey: 'time10min' as const, descKey: 'time10minDesc' as const },
  { value: '1hr+', labelKey: 'time1hour' as const, descKey: 'time1hourDesc' as const },
];

export function ProfileEditForm({
  userId,
  initialName,
  initialTimeAvailable,
  initialSkills,
}: ProfileEditFormProps) {
  const t = useTranslations('ProfileEdit');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [timeAvailable, setTimeAvailable] = useState(initialTimeAvailable);
  const [skills, setSkills] = useState(initialSkills);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('nameRequired'));
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
        setError(data.error || t('saveFailed'));
      }
    } catch {
      setError(t('saveFailed'));
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
        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {t('title')}
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <label htmlFor="edit-name" className="mb-1 block text-sm font-medium">
          {t('nameLabel')}
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
          {t('timeLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_OPTION_KEYS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeAvailable(opt.value)}
              className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                timeAvailable === opt.value
                  ? 'border-blue-500 bg-blue-50 font-medium text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
              }`}
            >
              <span className="block font-medium">{t(opt.labelKey)}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {t(opt.descKey)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="edit-skills" className="mb-1 block text-sm font-medium">
          {t('skillsLabel')}
        </label>
        <input
          id="edit-skills"
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder={t('skillsPlaceholder')}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('skillsHint')}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {saving ? t('saving') : t('save')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
