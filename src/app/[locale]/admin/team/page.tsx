import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { PageHeader } from '@/components/layout/page-header';
import { TeamPermissions } from '@/components/interactive/team-permissions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Team');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) redirect(`/${locale}`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <TeamPermissions />
    </div>
  );
}
