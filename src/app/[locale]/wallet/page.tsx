import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import {
  getOrCreateWallet,
  getUserSpendingSummary,
  getWalletTransactions,
} from '@/lib/queries/wallet';
import { getActionInitiatives } from '@/lib/queries/action-initiatives';
import { translateActionInitiatives } from '@/lib/queries/translate';
import { PageHeader } from '@/components/layout/page-header';
import { WalletBalance } from '@/components/data/wallet-balance';
import { TransactionList } from '@/components/data/transaction-list';
import { ActionInitiativeProgress } from '@/components/data/action-initiative-progress';
import { TopUpForm } from '@/components/interactive/topup-form';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function WalletPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Wallet');

  const userId = await getSession();
  const user = userId ? await getUserById(userId) : null;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-1 text-lg font-semibold">{t('createPromptTitle')}</p>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('createPromptDesc')}</p>
          <Link
            href="/profile"
            className="inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t('createAccount')}
          </Link>
        </div>
      </div>
    );
  }

  const wallet = await getOrCreateWallet(user.id);
  const [summary, transactions, rawActionInitiatives] = await Promise.all([
    getUserSpendingSummary(user.id),
    getWalletTransactions(wallet.id),
    getActionInitiatives(undefined, 'active'),
  ]);
  const activeActionInitiatives = await translateActionInitiatives(rawActionInitiatives, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} />

      <div className="mb-6">
        <WalletBalance
          balance_pence={wallet.balance_pence}
          total_loaded_pence={wallet.total_loaded_pence}
          total_spent_pence={wallet.total_spent_pence}
          projects_supported={summary.issuesSupported}
        />
      </div>

      <div className="mb-6">
        <TopUpForm />
      </div>

      {activeActionInitiatives.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('activeProjects')}</h2>
            <Link
              href="/action-initiatives"
              className="text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {t('viewAll')}
            </Link>
          </div>
          <ActionInitiativeProgress actionInitiatives={activeActionInitiatives.slice(0, 4)} />
        </div>
      )}

      <section>
        <TransactionList transactions={transactions} />
      </section>
    </div>
  );
}
