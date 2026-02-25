import { redirect } from 'next/navigation';

/**
 * Root-level redirect for Auth.js callback.
 * Signup sets callbackUrl to `/onboard` (no locale prefix),
 * but the actual page lives at `/[locale]/onboard`.
 */
export default function OnboardRedirect() {
  redirect('/en/onboard');
}
