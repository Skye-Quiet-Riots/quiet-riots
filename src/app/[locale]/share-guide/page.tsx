import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasAnyRole } from '@/lib/queries/roles';
import { getApplicationsForReview } from '@/lib/queries/shares';
import { PageHeader } from '@/components/layout/page-header';
import { ShareGuideDashboard } from '@/components/interactive/share-guide-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ShareGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ShareGuide');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const hasAccess = await hasAnyRole(userId, ['share_guide', 'administrator']);
  if (!hasAccess) redirect(`/${locale}`);

  const applications = await getApplicationsForReview(
    ['under_review', 'approved', 'identity_submitted', 'issued', 'rejected'],
    100,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ShareGuideDashboard initialApplications={applications} currentUserId={userId} />
    </div>
  );
}
