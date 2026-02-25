import { redirect } from 'next/navigation';

/**
 * Root-level redirect for Auth.js.
 * Auth.js pages config uses `/auth/verify` (no locale prefix),
 * but the actual page lives at `/[locale]/auth/verify`.
 */
export default function AuthVerifyRedirect() {
  redirect('/en/auth/verify');
}
