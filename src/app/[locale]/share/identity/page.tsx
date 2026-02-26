import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getOrCreateShareApplication } from '@/lib/queries/shares';
import { PageHeader } from '@/components/layout/page-header';
import { ShareIdentityForm } from '@/components/interactive/share-identity-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ShareIdentityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Share');

  const userId = await getSession();
  if (!userId) {
    redirect(`/${locale}/auth/signin`);
  }

  const application = await getOrCreateShareApplication(userId);

  // Only allow identity submission when status is 'approved'
  if (application.status !== 'approved') {
    redirect(`/${locale}/share`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title={t('identityTitle')} />
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{t('identityDesc')}</p>
      <ShareIdentityForm />
    </div>
  );
}
