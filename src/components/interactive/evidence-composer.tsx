'use client';

import { useState } from 'react';
import type { Evidence } from '@/types';
import { trackEvent } from '@/lib/analytics';

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
  const [content, setContent] = useState('');
  const [orgId, setOrgId] = useState(preselectedOrgId ?? '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [showMedia, setShowMedia] = useState(false);
  const [posting, setPosting] = useState(false);

  async function handleSubmit() {
    if (!content.trim() || posting) return;
    setPosting(true);

    // Determine media type
    let mediaType: 'text' | 'photo' | 'video' | 'link' = 'text';
    const photoUrls: string[] = [];
    const externalUrls: string[] = [];

    if (photoUrl.trim()) {
      mediaType = 'photo';
      photoUrls.push(photoUrl.trim());
    }
    if (externalUrl.trim()) {
      if (mediaType === 'text') mediaType = 'link';
      externalUrls.push(externalUrl.trim());
    }
    if (videoUrl.trim()) {
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
        video_url: videoUrl.trim() || null,
        external_urls: externalUrls,
        live: false,
      }),
    });

    if (res.ok) {
      const { data } = await res.json();
      trackEvent('evidence_submitted', { issue_id: issueId, media_type: mediaType });
      onSubmit?.(data);
      setContent('');
      setPhotoUrl('');
      setVideoUrl('');
      setExternalUrl('');
      setShowMedia(false);
    }
    setPosting(false);
  }

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
            <option value="">General (no specific organisation)</option>
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
        placeholder="Say what you think..."
        rows={3}
        className="w-full resize-none rounded-md border border-zinc-200 p-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
      />

      {/* Media inputs (toggleable) */}
      {showMedia && (
        <div className="mt-2 space-y-2">
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Photo URL (e.g. https://...)"
            className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {photoUrl && (
            <div className="h-24 w-24 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
          )}
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL (e.g. YouTube link)"
            className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="External link (e.g. news article)"
            className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowMedia(!showMedia)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {showMedia ? 'Hide media' : '📎 Add photos, video, links'}
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {posting ? 'Posting...' : 'Submit Evidence'}
        </button>

        <button
          onClick={onGoLive}
          className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          🔴 Go Live Now
        </button>
      </div>
    </div>
  );
}
