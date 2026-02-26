import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
import { getUserById, getUserIssues, getUserConnectedAccounts } from '@/lib/queries/users';
import { getUserFeedPostCount, getUserTotalLikes } from '@/lib/queries/community';
import { PageHeader } from '@/components/layout/page-header';
import { StatBadge } from '@/components/data/stat-badge';
import { CategoryBadge } from '@/components/data/category-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import { ProfileEditForm } from '@/components/interactive/profile-edit-form';
import { ProfileCreateForm } from '@/components/interactive/profile-create-form';
import { AvatarUpload } from '@/components/interactive/avatar-upload';
import { ConnectedAccounts } from '@/components/interactive/connected-accounts';
import { PhoneManagement } from '@/components/interactive/phone-management';
import type { Category } from '@/types';

interface UserIssueRow {
  issue_id: string;
  issue_name: string;
  category: Category;
  rioter_count: number;
  trending_delta: number;
  joined_at: string;
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Profile');

  const userId = await getSession();

  if (!userId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ProfileCreateForm />
      </div>
    );
  }

  const user = await getUserById(userId);
  if (!user) {
    redirect('/');
  }

  const [rawIssues, postCount, totalLikes, connectedAccounts] = await Promise.all([
    getUserIssues(userId),
    getUserFeedPostCount(userId),
    getUserTotalLikes(userId),
    getUserConnectedAccounts(userId),
  ]);
  // getUserIssues returns flat rows with joined issue columns
  const issues = rawIssues as unknown as UserIssueRow[];

  const memberSince = new Date(user.created_at).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} />

      {/* Profile card */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <AvatarUpload currentUrl={user.avatar_url} userName={user.name} />
            <div>
              <h2 className="text-lg font-bold">{user.name}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
              {user.phone ? (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {user.phone}
                  {user.phone_verified ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      {t('phoneVerified')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {t('phoneNotVerified')}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{t('noPhone')}</p>
              )}
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {t('memberSince')} {memberSince}
              </p>
            </div>
          </div>
          <ProfileEditForm
            userId={user.id}
            initialName={user.name}
            initialTimeAvailable={user.time_available}
            initialSkills={user.skills}
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/50">
            <span className="text-zinc-500 dark:text-zinc-400">{t('time')}</span>
            <span className="font-medium">{user.time_available}</span>
          </div>
          {user.skills && (
            <div className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/50">
              <span className="text-zinc-500 dark:text-zinc-400">{t('skills')}</span>
              <span className="font-medium">{user.skills}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatBadge value={issues.length} label={t('quietRiot', { count: issues.length })} />
        <StatBadge value={postCount} label={t('posts', { count: postCount })} />
        <StatBadge value={totalLikes} label={t('likes', { count: totalLikes })} />
      </div>

      {/* Connected accounts */}
      <ConnectedAccounts accounts={connectedAccounts} />

      {/* Phone management */}
      <PhoneManagement currentPhone={user.phone} phoneVerified={!!user.phone_verified} />

      {/* Joined issues */}
      <section>
        <h2 className="mb-4 text-lg font-bold">{t('yourRiots')}</h2>
        {issues.length > 0 ? (
          <div className="space-y-3">
            {issues.map((item) => (
              <Link
                key={item.issue_id}
                href={`/issues/${item.issue_id}`}
                className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div>
                  <span className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    {item.issue_name}
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CategoryBadge category={item.category} />
                    <TrendingIndicator delta={item.trending_delta} />
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-semibold">
                    {item.rioter_count.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('rioters')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-1 text-lg font-semibold">{t('noRiots')}</p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('findIssues')}</p>
            <Link
              href="/issues"
              className="inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t('browseIssues')}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
