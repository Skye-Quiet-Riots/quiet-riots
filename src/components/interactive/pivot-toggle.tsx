'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IssuePivotRow, OrgPivotRow } from '@/types';
import { PivotTable } from '@/components/data/pivot-table';

interface PivotToggleProps {
  issuePivotRows: IssuePivotRow[];
  orgPivotRows: OrgPivotRow[];
  currentOrgId?: string;
  currentIssueId?: string;
  issueId?: string;
  issueName?: string;
  orgName?: string;
}

export function PivotToggle({
  issuePivotRows,
  orgPivotRows,
  currentOrgId,
  currentIssueId,
  issueId,
  issueName,
  orgName,
}: PivotToggleProps) {
  const t = useTranslations('Pivot');
  const [mode, setMode] = useState<'issue' | 'org'>('issue');

  const totalIssuePivot = issuePivotRows.reduce((sum, r) => sum + r.rioter_count, 0);

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50/30 p-5 dark:border-purple-800 dark:bg-purple-900/10">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
          {t('title')}
        </h3>
        {mode === 'issue' && (
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {totalIssuePivot.toLocaleString()} {t('peopleGlobally')}
          </span>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="mb-4 flex gap-1 rounded-lg bg-purple-100 p-1 dark:bg-purple-900/30">
        <button
          onClick={() => setMode('issue')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            mode === 'issue'
              ? 'bg-white text-purple-700 shadow-sm dark:bg-zinc-900 dark:text-purple-300'
              : 'text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
          }`}
        >
          {t('issuePivot')}
          <span className="mt-0.5 block text-xs font-normal opacity-70">{t('issuePivotDesc')}</span>
        </button>
        <button
          onClick={() => setMode('org')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            mode === 'org'
              ? 'bg-white text-purple-700 shadow-sm dark:bg-zinc-900 dark:text-purple-300'
              : 'text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
          }`}
        >
          {t('orgPivot')}
          <span className="mt-0.5 block text-xs font-normal opacity-70">{t('orgPivotDesc')}</span>
        </button>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {mode === 'issue'
          ? t('seeIssueAcross', { issueName: issueName || '' })
          : t('seeOrgIssues', { orgName: orgName || 'this organisation' })}
      </p>

      {/* Pivot data */}
      {mode === 'issue' ? (
        <PivotTable mode="issue" rows={issuePivotRows} currentOrgId={currentOrgId} issueId={issueId} />
      ) : (
        <PivotTable mode="org" rows={orgPivotRows} currentIssueId={currentIssueId} />
      )}
    </div>
  );
}
