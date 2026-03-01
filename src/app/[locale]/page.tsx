import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getTrendingIssues } from '@/lib/queries/issues';
import { getTrendingReels } from '@/lib/queries/reels';
import { translateEntities } from '@/lib/queries/translate';
import { getTranslation } from '@/lib/queries/translations';
import { IssueCard } from '@/components/cards/issue-card';

export const dynamic = 'force-dynamic';

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');
  const rawTrending = await getTrendingIssues(6);
  const trending = await translateEntities(rawTrending, 'issue', locale);
  const topReels = await getTrendingReels(1);
  const topReel = topReels[0];

  // Translate the issue name shown alongside the top reel
  if (topReel && locale !== 'en') {
    const translatedName = await getTranslation('issue', topReel.issue_id, 'name', locale);
    if (translatedName) topReel.issue_name = translatedName;
  }

  return (
    <div className="flex flex-col">
      {/* Hero — full-width gradient banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-24 text-center text-white sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-200">
            {t('tagline')}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {t('headline')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-blue-100">
            {t('description')}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/issues"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
            >
              {t('browseIssues')}
            </Link>
            <a
              href="#how"
              className="rounded-full border border-white/40 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/10"
            >
              {t('howItWorks')}
            </a>
          </div>
        </div>
      </section>

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
