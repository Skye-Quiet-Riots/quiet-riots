/**
 * Global Vitest setup for next-intl mocking.
 *
 * Provides mock implementations that return actual English strings from
 * messages/en.json so existing test assertions (which check for English text)
 * continue to work after the i18n migration.
 */
import { vi } from 'vitest';
import messages from '../../messages/en.json';

type Messages = Record<string, Record<string, string>>;
const msgs = messages as Messages;

/**
 * Creates a t() function for a given namespace that looks up keys from en.json.
 * Supports simple ICU interpolation: replaces {varName} with provided params.
 * Falls back to returning the key itself if not found.
 */
function createTranslator(namespace: string) {
  return (key: string, params?: Record<string, string | number>) => {
    const ns = msgs[namespace];
    let value = ns?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        // Replace simple {param} placeholders — skip ICU plural blocks
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  };
}

// Mock next-auth/react — default to authenticated so AuthGate renders children
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated' as const,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next-intl (client-side hooks)
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => createTranslator(namespace),
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next-intl/server (server-side functions)
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => createTranslator(namespace),
  setRequestLocale: () => {},
  getLocale: async () => 'en',
}));

// Mock @/i18n/navigation (locale-aware navigation)
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createElement } = require('react');
    return createElement('a', { href, ...props }, children);
  },
  usePathname: () => '/issues',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  redirect: vi.fn(),
  getPathname: vi.fn(),
}));
