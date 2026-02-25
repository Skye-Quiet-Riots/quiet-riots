import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ params, searchParams: searchParamsPromise }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const searchParams = await searchParamsPromise;
  const error = searchParams.error;
  const t = await getTranslations('Auth');

  const errorMessages: Record<string, string> = {
    Configuration: t('errorConfig'),
    AccessDenied: t('errorAccess'),
    Verification: t('errorVerification'),
    Default: t('errorDefault'),
  };

  const message = errorMessages[error || ''] || errorMessages.Default;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold">{t('errorTitle')}</h1>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {t('tryAgain')}
        </Link>
      </div>
    </div>
  );
}
