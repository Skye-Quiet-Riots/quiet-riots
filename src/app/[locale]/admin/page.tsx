import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { getUsersWithRoles, getUserCount, getRoleCount } from '@/lib/queries/admin';
import { PageHeader } from '@/components/layout/page-header';
import { AdminDashboard } from '@/components/interactive/admin-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) redirect(`/${locale}`);

  const [usersWithRoles, totalUsers, guideCount, adminCount] = await Promise.all([
    getUsersWithRoles(),
    getUserCount(),
    getRoleCount('setup_guide'),
    getRoleCount('administrator'),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <AdminDashboard
        initialUsersWithRoles={usersWithRoles}
        stats={{ totalUsers, guideCount, adminCount }}
      />
    </div>
  );
}
