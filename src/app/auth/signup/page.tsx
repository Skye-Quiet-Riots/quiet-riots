import { redirect } from 'next/navigation';

/**
 * Root-level redirect for Auth.js.
 * Auth.js pages config uses `/auth/signup` (no locale prefix),
 * but the actual page lives at `/[locale]/auth/signup`.
 */
export default function AuthSignUpRedirect() {
  redirect('/en/auth/signup');
}
