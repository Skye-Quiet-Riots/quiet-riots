'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Evidence } from '@/types';
import { EvidenceComposer } from './evidence-composer';
import { LiveWarningModal } from './live-warning-modal';
import { LiveStreamView } from './live-stream-view';
import { LiveNowIndicator } from '@/components/data/live-now-indicator';
import { EvidenceCard } from '@/components/cards/evidence-card';
import { trackEvent } from '@/lib/analytics';

interface EvidenceSectionProps {
  issueId: string;
  initialEvidence: Evidence[];
  organisations: { id: string; name: string }[];
  preselectedOrgId?: string;
}

export function EvidenceSection({
  issueId,
  initialEvidence,
  organisations,
  preselectedOrgId,
}: EvidenceSectionProps) {
  const t = useTranslations('Evidence');
  const [evidence, setEvidence] = useState(initialEvidence);
  const [showLiveWarning, setShowLiveWarning] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const liveEvidence = evidence.filter((e) => e.live === 1);

  function handleNewEvidence(newEvidence: Evidence) {
    setEvidence([newEvidence, ...evidence]);
  }

  function handleGoLiveClick() {
    setShowLiveWarning(true);
  }

  function handleGoLiveConfirm() {
    setShowLiveWarning(false);
    setIsLive(true);
    trackEvent('evidence_go_live', { issue_id: issueId });
  }

  async function handleEndStream() {
    // Create a live evidence post
    const res = await fetch(`/api/issues/${issueId}/evidence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Went live to gather evidence',
        media_type: 'live_stream',
        live: true,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setEvidence([data, ...evidence]);
    }
    setIsLive(false);
    trackEvent('evidence_end_stream', { issue_id: issueId });
  }

  return (
    <div>
      {/* Live stream view (when user is live) */}
      {isLive ? (
        <div className="mb-4">
          <LiveStreamView onEnd={handleEndStream} />
        </div>
      ) : (
        /* Evidence composer */
        <div className="mb-4">
          <EvidenceComposer
            issueId={issueId}
            organisations={organisations}
            preselectedOrgId={preselectedOrgId}
            onSubmit={handleNewEvidence}
            onGoLive={handleGoLiveClick}
          />
        </div>
      )}

      {/* Live now indicator */}
      <LiveNowIndicator liveEvidence={liveEvidence} />

      {/* Evidence feed */}
      <div className="space-y-3">
        {evidence.map((ev) => (
          <EvidenceCard key={ev.id} evidence={ev} issueId={issueId} />
        ))}
      </div>

      {evidence.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          {t('empty')}
        </p>
      )}

      {/* Live warning modal */}
      <LiveWarningModal
        open={showLiveWarning}
        onConfirm={handleGoLiveConfirm}
        onCancel={() => setShowLiveWarning(false)}
      />
    </div>
  );
}
