import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getOrCreateShareApplication, checkShareEligibility } from '@/lib/queries/shares';
import { getOrCreateWallet } from '@/lib/queries/wallet';
import { PageHeader } from '@/components/layout/page-header';
import { ShareInfoPage } from '@/components/interactive/share-info-page';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SharePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Share');

  const userId = await getSession();
  if (!userId) {
    redirect(`/${locale}/auth/signin`);
  }

  const [application, eligibility, wallet] = await Promise.all([
    getOrCreateShareApplication(userId),
    checkShareEligibility(userId),
    getOrCreateWallet(userId).catch(() => ({ balance_pence: 0 })),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('heroTitle')} />
      <ShareInfoPage
        application={{
          id: application.id,
          status: application.status,
          certificate_number: application.certificate_number,
          issued_at: application.issued_at,
          reapply_count: application.reapply_count,
          eligible_at: application.eligible_at,
          created_at: application.created_at,
        }}
        eligibility={eligibility}
        walletBalance={wallet.balance_pence}
      />
    </div>
  );
}
