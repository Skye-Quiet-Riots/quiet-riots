'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
  currentUrl: string | null;
  userName: string;
}

export function AvatarUpload({ currentUrl, userName }: AvatarUploadProps) {
  const t = useTranslations('ProfileEdit');
  const [avatarUrl, setAvatarUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = userName.charAt(0).toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.data.url);
      } else {
        setError(data.error || t('saveFailed'));
      }
    } catch {
      setError(t('saveFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemove() {
    setError('');
    setUploading(true);
    try {
      const res = await fetch('/api/users/me/avatar', { method: 'DELETE' });
      if (res.ok) {
        setAvatarUrl(null);
      } else {
        const data = await res.json();
        setError(data.error || t('saveFailed'));
      }
    } catch {
      setError(t('saveFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="group relative h-14 w-14 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        aria-label={t('avatarUpload')}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-purple-100 text-2xl font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {initial}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? '...' : t('avatarChange')}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label={t('avatarUpload')}
      />

      {avatarUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={uploading}
          className="text-xs text-zinc-500 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
        >
          {t('avatarRemove')}
        </button>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
