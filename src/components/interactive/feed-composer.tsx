'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { FeedPost } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { AuthGate } from './auth-gate';

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface FeedComposerProps {
  issueId: string;
  onPost?: (post: FeedPost) => void;
}

export function FeedComposer({ issueId, onPost }: FeedComposerProps) {
  const t = useTranslations('Feed');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setError(null);

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t('invalidFileType'));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t('fileTooLarge'));
        return;
      }
    }

    const remaining = MAX_PHOTOS - photos.length;
    const newFiles = files.slice(0, remaining);
    const newPhotos = [...photos, ...newFiles];
    setPhotos(newPhotos);

    // Generate previews
    const newPreviews = [...previews];
    for (const file of newFiles) {
      newPreviews.push(URL.createObjectURL(file));
    }
    setPreviews(newPreviews);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of photos) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        urls.push(data.data?.url ?? data.url);
      }
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && photos.length === 0) return;
    setPosting(true);
    setError(null);

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        setUploading(true);
        photoUrls = await uploadPhotos();
        setUploading(false);
      }

      const res = await fetch(`/api/issues/${issueId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          photo_urls: photoUrls,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const post = data.data ?? data;
        setContent('');
        setPhotos([]);
        // Revoke all preview URLs
        for (const url of previews) URL.revokeObjectURL(url);
        setPreviews([]);
        onPost?.(post);
        trackEvent('feed_post_created', { issueId, hasPhotos: photoUrls.length > 0 });
      }
    } finally {
      setPosting(false);
      setUploading(false);
    }
  }

  return (
    <AuthGate action="post to the community feed">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('composerPlaceholder')}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={posting || (!content.trim() && photos.length === 0)}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {uploading ? t('uploading') : t('post')}
          </button>
        </div>

        {/* Photo previews */}
        {previews.length > 0 && (
          <div className="flex gap-2">
            {previews.map((url, i) => (
              <div key={url} className="relative h-16 w-16">
                <img
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-zinc-900"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add photos button */}
        <div className="flex items-center gap-2">
          {photos.length < MAX_PHOTOS && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                📷 {t('addPhotos')}
              </button>
            </>
          )}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </form>
    </AuthGate>
  );
}
