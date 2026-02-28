import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { getActionInitiativeById } from '@/lib/queries/action-initiatives';
import { getIssueById } from '@/lib/queries/issues';
import { translateEntity, translateActionInitiatives } from '@/lib/queries/translate';
import { getWalletByUserId } from '@/lib/queries/wallet';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryBadge } from '@/components/data/category-badge';
import { StatBadge } from '@/components/data/stat-badge';
import { PayForm } from '@/components/interactive/pay-form';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ActionInitiativeDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([
    getTranslations('ActionInitiativeDetail'),
    getTranslations('Categories'),
  ]);

  const rawActionInitiative = await getActionInitiativeById(id);
  if (!rawActionInitiative) notFound();

  const [[actionInitiative], rawIssue, userId] = await Promise.all([
    translateActionInitiatives([rawActionInitiative], locale),
    getIssueById(rawActionInitiative.issue_id),
    getSession(),
  ]);
  const issue = rawIssue ? await translateEntity(rawIssue, 'issue', locale) : null;

  const wallet = userId ? await getWalletByUserId(userId) : null;
  const pct = Math.min(
    100,
    Math.round((actionInitiative.committed_pence / actionInitiative.target_pence) * 100),
  );

  function getStatusDisplay(status: string): { label: string; className: string } {
    switch (status) {
      case 'goal_reached':
        return {
          label: t('fullyFunded'),
          className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        };
      case 'delivered':
        return {
          label: t('disbursed'),
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        };
      case 'cancelled':
        return {
          label: t('cancelled'),
          className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        };
      default:
        return {
          label: t('active'),
          className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        };
    }
  }

  const statusDisplay = getStatusDisplay(actionInitiative.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={actionInitiative.title}
        breadcrumbs={[
          { label: t('breadcrumb'), href: '/action-initiatives' },
          { label: actionInitiative.title },
        ]}
      />

      {/* Issue link */}
      {issue && (
        <div className="mb-4 flex items-center gap-2">
          <CategoryBadge category={issue.category} label={tc(issue.category)} size="sm" />
          <Link
            href={`/issues/${issue.id}`}
            className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            {issue.name}
          </Link>
        </div>
      )}

      {/* Status badge */}
      <div className="mb-4">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusDisplay.className}`}
        >
          {statusDisplay.label}
        </span>
      </div>

      {/* Description */}
      {actionInitiative.description && (
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">{actionInitiative.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {t('progressText', {
          committed: formatCurrency(actionInitiative.committed_pence, actionInitiative.currency_code),
          target: formatCurrency(actionInitiative.target_pence, actionInitiative.currency_code),
          pct,
        })}
      </p>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge
          value={formatCurrency(actionInitiative.target_pence, actionInitiative.currency_code)}
          label={t('target')}
        />
        <StatBadge
          value={formatCurrency(actionInitiative.committed_pence, actionInitiative.currency_code)}
          label={t('raised')}
        />
        <StatBadge
          value={actionInitiative.supporter_count}
          label={t('backers', { count: actionInitiative.supporter_count })}
        />
        <StatBadge value={`${actionInitiative.service_fee_pct}%`} label={t('platformFee')} />
      </div>

      {/* Pay form or status message */}
      {actionInitiative.status === 'active' ? (
        wallet ? (
          <div className="mb-8">
            <PayForm
              actionInitiativeId={actionInitiative.id}
              actionInitiativeTitle={actionInitiative.title}
              userBalance={wallet.balance_pence}
            />
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-2 text-sm font-semibold">{t('wantToSupport')}</p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {userId ? t('topUpFirst') : t('createAccountPrompt')}
            </p>
            <Link
              href={userId ? '/wallet' : '/profile'}
              className="inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {userId ? t('goToWallet') : t('createAccount')}
            </Link>
          </div>
        )
      ) : (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('completedMessage', {
              status: actionInitiative.status,
              count: actionInitiative.supporter_count,
            })}
          </p>
        </div>
      )}

      {/* Recipient */}
      {actionInitiative.recipient && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('recipient')}
          </h3>
          {actionInitiative.recipient_url ? (
            <a
              href={actionInitiative.recipient_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {actionInitiative.recipient}
            </a>
          ) : (
            <p className="text-sm font-medium">{actionInitiative.recipient}</p>
          )}
        </div>
      )}
    </div>
  );
}
