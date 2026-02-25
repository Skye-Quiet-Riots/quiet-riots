import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { getSuggestionsByStatus } from '@/lib/queries/suggestions';
import { PageHeader } from '@/components/layout/page-header';
import { SetupDashboard } from '@/components/interactive/setup-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) redirect(`/${locale}`);

  const suggestions = await getSuggestionsByStatus(undefined, 100, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Setup Guide" subtitle="Review and manage Quiet Riot suggestions" />
      <SetupDashboard initialSuggestions={suggestions} />
    </div>
  );
}
