import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasAnyRole } from '@/lib/queries/roles';
import { getApplicationsForReview } from '@/lib/queries/shares';
import { PageHeader } from '@/components/layout/page-header';
import { ComplianceDashboard } from '@/components/interactive/compliance-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CompliancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Compliance');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const hasAccess = await hasAnyRole(userId, ['compliance_guide', 'administrator']);
  if (!hasAccess) redirect(`/${locale}`);

  const applications = await getApplicationsForReview(
    ['identity_submitted', 'forwarded_senior'],
    100,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ComplianceDashboard initialApplications={applications} currentUserId={userId} />
    </div>
  );
}
