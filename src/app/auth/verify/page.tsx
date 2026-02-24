import Link from 'next/link';

export default function VerifyPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold">Check your email</h1>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          A sign-in link has been sent to your email address. Click the link to continue.
        </p>
        <Link
          href="/auth/signin"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
