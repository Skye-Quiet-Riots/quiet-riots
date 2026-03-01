import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { getChickenDeployment } from '@/lib/queries/chicken';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { ChickenCancelButton } from '@/components/interactive/chicken-cancel-button';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

function getStatusDisplay(
  status: string,
  t: (key: string) => string,
): { label: string; className: string } {
  switch (status) {
    case 'paid':
      return {
        label: t('statusPaid'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      };
    case 'accepted':
      return {
        label: t('statusAccepted'),
        className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
      };
    case 'in_progress':
      return {
        label: t('statusInProgress'),
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      };
    case 'delivered':
      return {
        label: t('statusDelivered'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      };
    case 'cancelled':
      return {
        label: t('statusCancelled'),
        className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      };
    case 'refunded':
      return {
        label: t('statusRefunded'),
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      };
    case 'disputed':
      return {
        label: t('statusDisputed'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      };
    default:
      return {
        label: status,
        className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      };
  }
}

export default async function ChickenDeploymentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ChickenDetail');

  const userId = await getSession();
  if (!userId) notFound();

  const deployment = await getChickenDeployment(id);
  if (!deployment || deployment.user_id !== userId) notFound();

  const statusDisplay = getStatusDisplay(deployment.status, t);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={t('title')}
        breadcrumbs={[
          { label: t('grandparentBreadcrumb'), href: '/chicken' },
          { label: t('parentBreadcrumb'), href: '/chicken/deployments' },
          { label: t('breadcrumb') },
        ]}
      />

      {/* Status */}
      <div className="mb-6">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${statusDisplay.className}`}
        >
          {statusDisplay.label}
        </span>
      </div>

      {/* Target Details */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('targetDetails')}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('name')}</dt>
            <dd className="font-medium">{deployment.target_name}</dd>
          </div>
          {deployment.target_role && (
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">{t('role')}</dt>
              <dd className="font-medium">{deployment.target_role}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('address')}</dt>
            <dd className="font-medium">{deployment.target_address}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('city')}</dt>
            <dd className="font-medium">{deployment.target_city}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('country')}</dt>
            <dd className="font-medium">{deployment.target_country}</dd>
          </div>
        </dl>
      </section>

      {/* Message */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('message')}
        </h3>
        <p className="whitespace-pre-wrap text-sm">{deployment.message_text}</p>
      </section>

      {/* Delivery Information */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('deliveryInfo')}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('deliveryType')}</dt>
            <dd className="font-medium">
              {deployment.express_delivery ? t('express') : t('standard')}
            </dd>
          </div>
          {deployment.estimated_delivery_date && (
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">{t('estimatedDelivery')}</dt>
              <dd className="font-medium">{deployment.estimated_delivery_date}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">{t('amountPaid')}</dt>
            <dd className="font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(deployment.amount_paid_pence, deployment.currency)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Fulfiller Info (if assigned) */}
      {deployment.fulfiller_name && (
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">{t('fulfillerName')}</dt>
              <dd className="font-medium">{deployment.fulfiller_name}</dd>
            </div>
            {deployment.fulfiller_notes && (
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">{t('fulfillerNotes')}</dt>
                <dd className="font-medium">{deployment.fulfiller_notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Proof Photo */}
      {deployment.proof_photo_url && (
        <section className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-green-700 dark:text-green-300">
            {t('proofPhoto')}
          </h3>
          <img
            src={deployment.proof_photo_url}
            alt="Delivery proof"
            className="max-h-96 w-full rounded-lg object-cover"
          />
        </section>
      )}

      {/* Delivered At */}
      {deployment.delivered_at && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">
          {t('deliveredAt')}: {new Date(deployment.delivered_at).toLocaleDateString()}
        </p>
      )}

      {/* Cancelled At */}
      {deployment.cancelled_at && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {t('cancelledAt')}: {new Date(deployment.cancelled_at).toLocaleDateString()}
        </p>
      )}

      {/* Linked Issue */}
      {deployment.issue_name && (
        <div className="mb-4">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('linkedIssue')}:</span>{' '}
          <Link
            href={`/issues/${deployment.issue_id}`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {deployment.issue_name}
          </Link>
        </div>
      )}

      {/* Cancel Button (only for paid deployments) */}
      {deployment.status === 'paid' && (
        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <ChickenCancelButton deploymentId={deployment.id} />
        </div>
      )}
    </div>
  );
}
