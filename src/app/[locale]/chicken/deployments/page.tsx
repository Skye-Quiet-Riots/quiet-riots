import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import { getUserChickenDeployments } from '@/lib/queries/chicken';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'accepted':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    case 'in_progress':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'delivered':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'cancelled':
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    case 'refunded':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'disputed':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}

export default async function ChickenDeploymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ChickenDeployments');

  const userId = await getSession();
  const user = userId ? await getUserById(userId) : null;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <Link
            href="/profile"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            {t('title')}
          </Link>
        </div>
      </div>
    );
  }

  const deployments = await getUserChickenDeployments(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={t('title')}
        breadcrumbs={[{ label: t('parentBreadcrumb'), href: '/chicken' }, { label: t('title') }]}
      />

      {deployments.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-400">{t('noDeployments')}</p>
          <Link
            href="/chicken"
            className="inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
          >
            {t('deployFirst')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => (
            <Link
              key={d.id}
              href={`/chicken/deployments/${d.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.target_name}</p>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {d.target_city}, {d.target_country}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(d.status)}`}
                  >
                    {d.status.replace('_', ' ')}
                  </span>
                  <p className="mt-1 text-sm font-medium">
                    {formatCurrency(d.amount_paid_pence, d.currency)}
                  </p>
                </div>
              </div>
              {d.estimated_delivery_date && (
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  {t('estimatedDelivery')}: {d.estimated_delivery_date}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
