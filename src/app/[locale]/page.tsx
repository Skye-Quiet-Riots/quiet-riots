import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getTrendingIssues } from '@/lib/queries/issues';
import { getTrendingReels } from '@/lib/queries/reels';
import { translateEntities } from '@/lib/queries/translate';
import { getTranslation } from '@/lib/queries/translations';
import { getSession } from '@/lib/session';
import { getPersonalFeed } from '@/lib/queries/personal-feed';
import { IssueCard } from '@/components/cards/issue-card';
import { PersonalFeed } from '@/components/interactive/personal-feed';

export const dynamic = 'force-dynamic';

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const tFeed = await getTranslations('PersonalFeed');
  const rawTrending = await getTrendingIssues(6);
  const trending = await translateEntities(rawTrending, 'issue', locale);
  const topReels = await getTrendingReels(1);
  const topReel = topReels[0];

  // Check if user is authenticated — show personal feed if so
  const userId = await getSession();
  let feedResult: Awaited<ReturnType<typeof getPersonalFeed>> | null = null;
  if (userId) {
    feedResult = await getPersonalFeed(userId, undefined, 20);
    // Translate issue names in feed activities
    const activities = feedResult.activities;
    if (locale !== 'en' && activities.length > 0) {
      const issueIds = [...new Set(activities.map((a) => a.issue_id))];
      const issueEntities = issueIds.map((id) => ({
        id,
        name: activities.find((a) => a.issue_id === id)!.issue_name,
      }));
      const translated = await translateEntities(issueEntities, 'issue', locale);
      const nameMap = new Map(translated.map((ti) => [ti.id, ti.name]));
      for (const activity of activities) {
        const translatedName = nameMap.get(activity.issue_id);
        if (translatedName) activity.issue_name = translatedName;
      }
    }
  }

  // Translate the issue name shown alongside the top reel
  if (topReel && locale !== 'en') {
    const translatedName = await getTranslation('issue', topReel.issue_id, 'name', locale);
    if (translatedName) topReel.issue_name = translatedName;
  }

  return (
    <div className="flex flex-col">
      {/* Hero — full-width light banner */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-6 py-16 text-center text-zinc-900 sm:py-24 dark:from-zinc-900 dark:to-zinc-950 dark:text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">
            {t('tagline')}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {t('headline')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t('description')}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/issues"
              className="rounded-full bg-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-800 hover:shadow-xl"
            >
              {t('browseIssues')}
            </Link>
            <a
              href="#how"
              className="rounded-full border border-zinc-300 px-8 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              {t('howItWorks')}
            </a>
          </div>
        </div>
      </section>

      {/* Personal Activity Feed (authenticated users only) */}
      {feedResult && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">{tFeed('title')}</h2>
            <PersonalFeed
              initialActivities={feedResult.activities}
              initialCursor={feedResult.next_cursor}
            />
          </div>
        </section>
      )}

      {/* Trending Issues */}
      {trending.length > 0 && (
        <section className="bg-zinc-50 px-6 py-16 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">{t('trendingIssues')}</h2>
              <Link
                href="/issues"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {t('viewAll')} &rarr;
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Riot Reel of the Day */}
      {topReel && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
              {t('reelOfTheDay')}
            </h2>
            <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <a
                href={topReel.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail URL */}
                <img
                  src={topReel.thumbnail_url}
                  alt={topReel.title}
                  className="aspect-video w-full object-cover transition-transform hover:scale-[1.02]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 text-xl text-white shadow-lg backdrop-blur-sm">
                    ▶
                  </div>
                </div>
              </a>
              <div className="p-4 text-center">
                <p className="font-semibold">{topReel.title}</p>
                {topReel.caption && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    &ldquo;{topReel.caption}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                  {t('riotersFunny', { count: topReel.upvotes.toLocaleString() })}
                  {' · '}
                  {t('from')}{' '}
                  <Link
                    href={`/issues/${topReel.issue_id}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {topReel.issue_name}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how" className="bg-zinc-50 px-6 py-16 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            {t('howItWorks')}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-zinc-800">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/50">
                🔍
              </div>
              <h3 className="mt-4 font-semibold">{t('findYourIssue')}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('findYourIssueDesc')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-zinc-800">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/50">
                🔀
              </div>
              <h3 className="mt-4 font-semibold">{t('useThePivot')}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('useThePivotDesc')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-zinc-800">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/50">
                ⚡
              </div>
              <h3 className="mt-4 font-semibold">{t('takeAction')}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('takeActionDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Image src="/logo-192.png" alt="Quiet Riots" width={48} height={48} />
          <h2 className="mt-4 text-xl font-bold italic text-zinc-700 dark:text-zinc-300">
            {t('missionQuote')}
          </h2>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {t.rich('basedOn', { em: (chunks) => <em>{chunks}</em> })}
          </p>
          <Link
            href="/issues"
            className="mt-6 inline-block rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t('joinMovement')}
          </Link>
        </div>
      </section>
    </div>
  );
}
