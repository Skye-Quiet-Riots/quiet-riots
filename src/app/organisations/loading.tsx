export default function OrganisationsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-72 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
        ))}
      </div>
    </div>
  );
}
