'use client';

export default function SignupForm() {
  return (
    <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder="you@example.com"
        className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-sm outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />
      <button
        type="submit"
        className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
      >
        Notify Me
      </button>
    </form>
  );
}
