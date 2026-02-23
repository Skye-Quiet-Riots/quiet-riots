'use client';

import posthog from 'posthog-js';

/**
 * Track a custom event via PostHog.
 * No-ops gracefully if PostHog is not initialised (no key configured).
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture(event, properties);
    }
  } catch {
    // Swallow — analytics should never break the app
  }
}

/**
 * Identify a user in PostHog (call after signup or login).
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.identify(userId, traits);
    }
  } catch {
    // Swallow
  }
}
