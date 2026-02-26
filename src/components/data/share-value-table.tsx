'use client';

import { useTranslations } from 'next-intl';

export function ShareValueTable() {
  const t = useTranslations('Share');

  const rows = [
    { stage: t('preSeed'), val: t('preSeedVal'), desc: t('preSeedDesc') },
    { stage: t('seed'), val: t('seedVal'), desc: t('seedDesc') },
    { stage: t('seriesA'), val: t('seriesAVal'), desc: t('seriesADesc') },
    { stage: t('seriesB'), val: t('seriesBVal'), desc: t('seriesBDesc') },
    { stage: t('seriesC'), val: t('seriesCVal'), desc: t('seriesCDesc') },
    { stage: t('ipo'), val: t('ipoVal'), desc: t('ipoDesc') },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="pb-2 pr-4 text-left font-semibold">{t('valuationStage')}</th>
            <th className="pb-2 pr-4 text-left font-semibold">{t('valuationAmount')}</th>
            <th className="pb-2 text-left font-semibold">{t('valuationWhat')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stage} className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-4 font-medium">{row.stage}</td>
              <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">{row.val}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
