'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const CONSENT_COOKIE = 'qr_consent';

interface ConsentPreferences {
  analytics: boolean;
  version: string;
}

function readConsentCookie(): ConsentPreferences | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && typeof parsed.analytics === 'boolean' && parsed.version) {
      return parsed as ConsentPreferences;
    }
  } catch {
    // Malformed cookie — treat as no consent
  }
  return null;
}

function initPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY || posthog.__loaded) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // We handle this manually for SPA navigation
    capture_pageleave: true,
  });
}

function disablePostHog() {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  posthog.opt_out_capturing();
  posthog.reset();
}

/**
 * Manage PostHog initialisation based on cookie consent.
 * Listens for the `consent-updated` custom event dispatched by the CookieConsent component.
 */
function PostHogConsentManager() {
  const initialised = useRef(false);

  const handleConsent = useCallback((prefs: ConsentPreferences | null) => {
    if (prefs?.analytics) {
      initPostHog();
      // If PostHog was previously opted out in this session, opt back in
      if (posthog.__loaded && posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      }
      initialised.current = true;
    } else if (initialised.current) {
      disablePostHog();
      initialised.current = false;
    }
  }, []);

  useEffect(() => {
    // Check existing consent on mount
    handleConsent(readConsentCookie());

    // Listen for consent changes from the CookieConsent component
    function onConsentUpdated(e: Event) {
      const detail = (e as CustomEvent<ConsentPreferences>).detail;
      handleConsent(detail);
    }

    window.addEventListener('consent-updated', onConsentUpdated);
    return () => window.removeEventListener('consent-updated', onConsentUpdated);
  }, [handleConsent]);

  return null;
}

/**
 * Track SPA page views on route change.
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += '?' + searchParams.toString();
      }
      ph.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    // No PostHog key configured — render children without analytics
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogConsentManager />
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}
