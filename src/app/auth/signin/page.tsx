import { redirect } from 'next/navigation';

/**
 * Root-level redirect for Auth.js.
 * Auth.js pages config uses `/auth/signin` (no locale prefix),
 * but the actual page lives at `/[locale]/auth/signin`.
 * This catches the redirect and sends to the English default.
 */
export default function AuthSignInRedirect() {
  redirect('/en/auth/signin');
}
