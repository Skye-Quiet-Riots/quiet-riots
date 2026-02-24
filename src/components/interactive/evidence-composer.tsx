'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Evidence } from '@/types';
import { trackEvent } from '@/lib/analytics';

interface UploadedFile {
  url: string;
  name: string;
  previewUrl: string;
}

interface UploadingFile {
  id: string;
  name: string;
  previewUrl: string;
}

interface EvidenceComposerProps {
  issueId: string;
  organisations: { id: string; name: string }[];
  preselectedOrgId?: string;
  onSubmit?: (evidence: Evidence) => void;
  onGoLive?: () => void;
}

export function EvidenceComposer({
  issueId,
  organisations,
  preselectedOrgId,
  onSubmit,
  onGoLive,
}: EvidenceComposerProps) {
  const t = useTranslations('Evidence');
  const [content, setContent] = useState('');
  const [orgId, setOrgId] = useState(preselectedOrgId ?? '');
  const [externalUrl, setExternalUrl] = useState('');
  const [showMedia, setShowMedia] = useState(false);
  const [posting, setPosting] = useState(false);

  // File upload state
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedFile[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingFile[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedFile | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<UploadingFile | null>(null);
  const [uploadError, setUploadError] = useState('');

  const isUploading = uploadingPhotos.length > 0 || !!uploadingVideo;

  async function uploadFile(file: File): Promise<{ url: string; mediaType: 'photo' | 'video' }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/evidence/upload', { method: 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Upload failed');
    return body.data;
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploadError('');

    const remaining = 4 - uploadedPhotos.length - uploadingPhotos.length;
    const toUpload = files.slice(0, remaining);

    if (files.length > remaining) {
      setUploadError(t('maxPhotos', { count: files.length - remaining }));
    }

    // Add to uploading state immediately with local previews
    const uploading: UploadingFile[] = toUpload.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      previewUrl: URL.createObjectURL(f),
    }));
    setUploadingPhotos((prev) => [...prev, ...uploading]);

    // Upload each in parallel
    const results = await Promise.allSettled(
      toUpload.map(async (file, i) => {
        const data = await uploadFile(file);
        return { url: data.url, name: uploading[i].name, previewUrl: uploading[i].previewUrl };
      }),
    );

    const succeeded: UploadedFile[] = [];
    const failedNames: string[] = [];
    const uploadingIds = uploading.map((u) => u.id);

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        succeeded.push(result.value);
      } else {
        failedNames.push(toUpload[i].name);
        URL.revokeObjectURL(uploading[i].previewUrl);
      }
    });

    // Move from uploading to uploaded
    setUploadingPhotos((prev) => prev.filter((p) => !uploadingIds.includes(p.id)));
    setUploadedPhotos((prev) => [...prev, ...succeeded]);

    if (failedNames.length > 0) {
      const msg =
        results.find((r) => r.status === 'rejected') &&
        (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
      setUploadError(
        msg instanceof Error ? msg.message : t('uploadFailed', { names: failedNames.join(', ') }),
      );
    }

    // Reset file input so the same file can be re-selected
    e.target.value = '';
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const previewUrl = URL.createObjectURL(file);
    const uploading: UploadingFile = { id: `v-${Date.now()}`, name: file.name, previewUrl };
    setUploadingVideo(uploading);

    try {
      const data = await uploadFile(file);
      setUploadedVideo({ url: data.url, name: file.name, previewUrl });
      setUploadingVideo(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('videoFailed'));
      URL.revokeObjectURL(previewUrl);
      setUploadingVideo(null);
    }

    e.target.value = '';
  }

  function removePhoto(index: number) {
    setUploadedPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  }

  function removeVideo() {
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo.previewUrl);
      setUploadedVideo(null);
    }
  }

  async function handleSubmit() {
    if (!content.trim() || posting || isUploading) return;
    setPosting(true);

    // Determine media type
    let mediaType: 'text' | 'photo' | 'video' | 'link' = 'text';
    const photoUrls = uploadedPhotos.map((p) => p.url);
    const externalUrls: string[] = [];

    if (photoUrls.length > 0) {
      mediaType = 'photo';
    }
    if (externalUrl.trim()) {
      if (mediaType === 'text') mediaType = 'link';
      externalUrls.push(externalUrl.trim());
    }
    if (uploadedVideo) {
      mediaType = 'video';
    }

    const res = await fetch(`/api/issues/${issueId}/evidence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: content.trim(),
        org_id: orgId || null,
        media_type: mediaType,
        photo_urls: photoUrls,
        video_url: uploadedVideo?.url ?? null,
        external_urls: externalUrls,
        live: false,
      }),
    });

    if (res.ok) {
      const { data } = await res.json();
      trackEvent('evidence_submitted', { issue_id: issueId, media_type: mediaType });
      onSubmit?.(data);
      // Clean up object URLs
      uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (uploadedVideo) URL.revokeObjectURL(uploadedVideo.previewUrl);
      // Reset state
      setContent('');
      setUploadedPhotos([]);
      setUploadedVideo(null);
      setExternalUrl('');
      setShowMedia(false);
      setUploadError('');
    }
    setPosting(false);
  }

  const totalPhotoSlots = uploadedPhotos.length + uploadingPhotos.length;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Organisation selector */}
      {organisations.length > 0 && !preselectedOrgId && (
        <div className="mb-3">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">{t('generalOrg')}</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Text input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('placeholder')}
        rows={3}
        className="w-full resize-none rounded-md border border-zinc-200 p-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
      />

      {/* Media inputs (toggleable) */}
      {showMedia && (
        <div className="mt-2 space-y-3">
          {/* Upload error */}
          {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

          {/* Photo upload */}
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('photosLabel')}
            </p>

            {/* Preview grid */}
            {totalPhotoSlots > 0 && (
              <div className="mb-2 grid grid-cols-4 gap-2">
                {uploadedPhotos.map((photo, i) => (
                  <div
                    key={photo.url}
                    className="group relative aspect-square overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-70 hover:opacity-100"
                      aria-label={t('removePhoto', { name: photo.name })}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {uploadingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="h-full w-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File picker */}
            {totalPhotoSlots < 4 && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300">
                <span>{t('addPhotos')}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  data-testid="photo-input"
                />
              </label>
            )}
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('photoFormats')}</p>
          </div>

          {/* Video upload */}
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('videoLabel')}
            </p>

            {/* Video preview */}
            {(uploadedVideo || uploadingVideo) && (
              <div className="mb-2 flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <span className="text-sm">&#9654;</span>
                <span className="flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                  {(uploadedVideo ?? uploadingVideo)!.name}
                </span>
                {uploadingVideo && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                )}
                {uploadedVideo && (
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="text-xs text-zinc-400 hover:text-red-500"
                    aria-label={t('removeVideo')}
                  >
                    &times;
                  </button>
                )}
              </div>
            )}

            {/* File picker */}
            {!uploadedVideo && !uploadingVideo && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300">
                <span>{t('addVideo')}</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoSelect}
                  className="hidden"
                  data-testid="video-input"
                />
              </label>
            )}
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('videoFormats')}</p>
          </div>

          {/* External link (unchanged — manual URL input) */}
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('linkLabel')}
            </p>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={t('linkPlaceholder')}
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowMedia(!showMedia)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {showMedia ? t('hideMedia') : t('addMedia')}
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || posting || isUploading}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {posting ? t('posting') : isUploading ? t('uploading') : t('submitEvidence')}
        </button>

        <button
          onClick={onGoLive}
          className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          {t('goLive')}
        </button>
      </div>
    </div>
  );
}
