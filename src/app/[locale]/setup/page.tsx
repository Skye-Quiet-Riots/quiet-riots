import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { getSuggestionsByStatus } from '@/lib/queries/suggestions';
import { getLanguageNames } from '@/lib/queries/translations';
import { getUserById } from '@/lib/queries/users';
import { PageHeader } from '@/components/layout/page-header';
import { SetupDashboard } from '@/components/interactive/setup-dashboard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Setup');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) redirect(`/${locale}`);

  const suggestions = await getSuggestionsByStatus(undefined, 100, 0);

  // Batch-fetch language names for all suggestion language codes
  const langCodes = [...new Set(suggestions.map((s) => s.language_code).filter(Boolean))];
  const languageMap = await getLanguageNames(langCodes);

  // Batch-fetch submitter info (deduplicate user IDs)
  const submitterIds = [...new Set(suggestions.map((s) => s.suggested_by))];
  const submitterMap: Record<string, { name: string; language: string; memberSince: string }> = {};
  await Promise.all(
    submitterIds.map(async (uid) => {
      const user = await getUserById(uid);
      if (user) {
        submitterMap[uid] = {
          name: user.display_name || user.name || 'Unknown',
          language: user.language_code || 'en',
          memberSince: user.created_at,
        };
      }
    }),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <SetupDashboard
        initialSuggestions={suggestions}
        languageMap={languageMap}
        submitterMap={submitterMap}
      />
    </div>
  );
}
