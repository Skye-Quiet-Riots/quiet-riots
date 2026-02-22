export function TopUpForm() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-600 dark:bg-zinc-800/50">
      <p className="mb-1 text-2xl">💳</p>
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Add Funds
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Stripe integration coming soon. You&apos;ll be able to load funds and contribute to
        campaigns directly.
      </p>
    </div>
  );
}
