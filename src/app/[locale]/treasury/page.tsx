import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasAnyRole } from '@/lib/queries/roles';
import { getTreasuryTransactions, getTreasuryBalance, getShareStats } from '@/lib/queries/shares';
import { PageHeader } from '@/components/layout/page-header';
import { TreasuryDashboard } from '@/components/interactive/treasury-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TreasuryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Treasury');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const hasAccess = await hasAnyRole(userId, ['treasury_guide', 'administrator']);
  if (!hasAccess) redirect(`/${locale}`);

  const [transactions, balance, stats] = await Promise.all([
    getTreasuryTransactions(100, 0),
    getTreasuryBalance(),
    getShareStats(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <TreasuryDashboard transactions={transactions} balance={balance} stats={stats} />
    </div>
  );
}
