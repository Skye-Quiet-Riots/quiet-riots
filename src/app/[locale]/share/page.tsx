import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import {
  getOrCreateShareApplication,
  checkShareEligibility,
  promoteToEligible,
} from '@/lib/queries/shares';
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

  const [initialApplication, eligibility, wallet] = await Promise.all([
    getOrCreateShareApplication(userId),
    checkShareEligibility(userId),
    getOrCreateWallet(userId).catch(() => ({ balance_pence: 0 })),
  ]);
  let application = initialApplication;

  // Auto-promote to 'available' if user meets eligibility criteria
  if (application.status === 'not_eligible' && eligibility.eligible) {
    const promoted = await promoteToEligible(userId);
    if (promoted) {
      // Re-fetch the updated application
      application = await getOrCreateShareApplication(userId);
    }
  }

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
