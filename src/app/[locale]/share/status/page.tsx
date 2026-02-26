import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getOrCreateShareApplication, getShareStatusHistory } from '@/lib/queries/shares';
import { PageHeader } from '@/components/layout/page-header';
import { ShareStatusTracker } from '@/components/data/share-status-tracker';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ShareStatusPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Share');

  const userId = await getSession();
  if (!userId) {
    redirect(`/${locale}/auth/signin`);
  }

  const application = await getOrCreateShareApplication(userId);
  const history = await getShareStatusHistory(application.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('statusTitle')} />

      <div className="mb-6">
        <ShareStatusTracker status={application.status} />
      </div>

      {/* Certificate */}
      {application.status === 'issued' && application.certificate_number && (
        <section className="mb-6 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
          <h2 className="mb-2 text-lg font-bold text-green-800 dark:text-green-200">
            {t('certificateTitle')}
          </h2>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <p>
              <span className="font-medium">{t('certificateNumber')}:</span>{' '}
              {application.certificate_number}
            </p>
            {application.issued_at && (
              <p>
                <span className="font-medium">{t('certificateIssued')}:</span>{' '}
                {new Date(application.issued_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Timeline / History */}
      {history.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold">{t('statusTimeline')}</h2>
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800"
              >
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{entry.from_status}</span>
                    {' → '}
                    <span className="font-medium">{entry.to_status}</span>
                  </p>
                  {entry.notes && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{entry.notes}</p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
