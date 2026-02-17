import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { getUserById, getUserIssues } from '@/lib/queries/users';
import { getUserFeedPostCount, getUserTotalLikes } from '@/lib/queries/community';
import { PageHeader } from '@/components/layout/page-header';
import { StatBadge } from '@/components/data/stat-badge';
import { CategoryBadge } from '@/components/data/category-badge';
import { TrendingIndicator } from '@/components/data/trending-indicator';
import { ProfileEditForm } from '@/components/interactive/profile-edit-form';
import { ProfileCreateForm } from '@/components/interactive/profile-create-form';
import type { Category } from '@/types';

interface UserIssueRow {
  issue_id: number;
  issue_name: string;
  category: Category;
  rioter_count: number;
  trending_delta: number;
  joined_at: string;
}

export default async function ProfilePage() {
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

  const [rawIssues, postCount, totalLikes] = await Promise.all([
    getUserIssues(userId),
    getUserFeedPostCount(userId),
    getUserTotalLikes(userId),
  ]);
  // getUserIssues returns flat rows with joined issue columns
  const issues = rawIssues as unknown as UserIssueRow[];

  const memberSince = new Date(user.created_at).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Your Profile" />

      {/* Profile card */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-lg font-bold">{user.name}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Member since {memberSince}
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
            <span className="text-zinc-500 dark:text-zinc-400">Time: </span>
            <span className="font-medium">{user.time_available}</span>
          </div>
          {user.skills && (
            <div className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/50">
              <span className="text-zinc-500 dark:text-zinc-400">Skills: </span>
              <span className="font-medium">{user.skills}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatBadge value={issues.length} label={issues.length === 1 ? 'Quiet Riot' : 'Quiet Riots'} />
        <StatBadge value={postCount} label={postCount === 1 ? 'post' : 'posts'} />
        <StatBadge value={totalLikes} label={totalLikes === 1 ? 'like received' : 'likes received'} />
      </div>

      {/* Joined issues */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Your Quiet Riots</h2>
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
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">rioters</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-1 text-lg font-semibold">No Quiet Riots yet</p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Find issues you care about and join the movement.
            </p>
            <Link
              href="/issues"
              className="inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Browse issues
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
