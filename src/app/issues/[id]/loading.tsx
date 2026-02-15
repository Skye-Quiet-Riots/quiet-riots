export default function IssueDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-2 h-8 w-80 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-5 w-96 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
        ))}
      </div>
      <div className="mb-8 h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
      <div className="mb-8 h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
    </div>
  );
}
