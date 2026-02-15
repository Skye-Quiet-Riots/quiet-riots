import Link from 'next/link';
import { getTrendingIssues } from '@/lib/queries/issues';
import { IssueCard } from '@/components/cards/issue-card';

export default function Home() {
  const trending = getTrendingIssues(6);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-500">
          The Issues One-Stop-Shop 🐔
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Change doesn&apos;t have to be loud to be&nbsp;powerful
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Find others who share your issues. Take action together.
          Quiet Riots connects people around shared frustrations
          and turns complaints into collective action.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/issues"
            className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
          >
            Browse Issues
          </Link>
          <Link
            href="#how"
            className="rounded-full border border-zinc-300 px-8 py-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* Trending Issues */}
      {trending.length > 0 && (
        <section className="border-t border-zinc-200 px-6 py-16 dark:border-zinc-800">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">🔥 Trending Issues</h2>
              <Link
                href="/issues"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                View all →
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

      {/* How It Works */}
      <section id="how" className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
                🔍
              </div>
              <h3 className="mt-4 font-semibold">Find Your Issue</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Search for any frustration — trains, broadband, NHS, climate.
                If it exists, we&apos;ll show you how many others share it.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
                🔀
              </div>
              <h3 className="mt-4 font-semibold">Use The Pivot</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                See the same issue across all organisations, or all issues at one
                organisation. Like tango dancers changing direction.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
                ⚡
              </div>
              <h3 className="mt-4 font-semibold">Take Action</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Ideas, actions, and community — personalised to your time and
                skills. Small actions add up to big change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-t border-zinc-200 px-6 py-16 dark:border-zinc-800">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-3xl">🐔</p>
          <h2 className="mt-4 text-xl font-bold italic text-zinc-700 dark:text-zinc-300">
            &ldquo;To change more for the better in our lifetimes than we dare to imagine is possible.&rdquo;
          </h2>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Based on the 2014 book <em>Quiet Riots</em> by Simon Darling
          </p>
          <Link
            href="/issues"
            className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
          >
            ✊ Join the Movement
          </Link>
        </div>
      </section>
    </div>
  );
}
