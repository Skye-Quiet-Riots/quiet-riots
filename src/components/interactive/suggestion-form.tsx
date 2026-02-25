'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  'Transport',
  'Telecoms',
  'Banking',
  'Health',
  'Education',
  'Environment',
  'Energy',
  'Water',
  'Insurance',
  'Housing',
  'Shopping',
  'Delivery',
  'Local',
  'Employment',
  'Tech',
  'Other',
] as const;

interface SuggestionFormProps {
  prefillText?: string;
}

export function SuggestionForm({ prefillText = '' }: SuggestionFormProps) {
  const router = useRouter();
  const t = useTranslations('SuggestForm');
  const tCat = useTranslations('Categories');
  const [suggestedName, setSuggestedName] = useState(prefillText);
  const [category, setCategory] = useState('');
  const [suggestedType, setSuggestedType] = useState<'issue' | 'organisation'>('issue');
  const [description, setDescription] = useState('');
  const [publicRecognition, setPublicRecognition] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestedName.trim() || !category) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggested_name: suggestedName.trim(),
          original_text: suggestedName.trim(),
          category,
          suggested_type: suggestedType,
          description: description.trim() || undefined,
          public_recognition: publicRecognition ? 1 : 0,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Failed to submit suggestion');
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <p className="mb-2 text-lg font-semibold text-green-800 dark:text-green-200">
          {t('successTitle')}
        </p>
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">{t('successMessage')}</p>
        <button
          onClick={() => router.push('/issues')}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {t('backToIssues')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="suggested-name"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('nameLabel')} *
        </label>
        <input
          id="suggested-name"
          type="text"
          value={suggestedName}
          onChange={(e) => setSuggestedName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          required
          maxLength={255}
        />
      </div>

      <div>
        <label
          htmlFor="type"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('typeLabel')} *
        </label>
        <select
          id="type"
          value={suggestedType}
          onChange={(e) => setSuggestedType(e.target.value as 'issue' | 'organisation')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          <option value="issue">{t('typeIssue')}</option>
          <option value="organisation">{t('typeOrganisation')}</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="category"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('categoryLabel')} *
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          required
        >
          <option value="">{t('categoryPlaceholder')}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {tCat(cat)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t('descriptionLabel')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="public-recognition"
          type="checkbox"
          checked={publicRecognition}
          onChange={(e) => setPublicRecognition(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="public-recognition" className="text-sm text-zinc-700 dark:text-zinc-300">
          {t('publicRecognition')}
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !suggestedName.trim() || !category}
        className="w-full rounded-md bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
