import { redirect } from 'next/navigation';

/**
 * Root-level redirect for Auth.js.
 * Auth.js pages config uses `/auth/error` (no locale prefix),
 * but the actual page lives at `/[locale]/auth/error`.
 * Preserves the ?error= query parameter so the locale page can display the right message.
 */
export default async function AuthErrorRedirect({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const error = searchParams.error;
  const target = error ? `/en/auth/error?error=${encodeURIComponent(error)}` : '/en/auth/error';
  redirect(target);
}
