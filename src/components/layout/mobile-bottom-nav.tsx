'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { NavSearch } from '@/components/interactive/nav-search';

interface NavItem {
  key: 'home' | 'search' | 'action' | 'inbox' | 'profile';
  href: string;
  /** Whether this tab requires authentication to show badge/active state */
  authRequired?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/' },
  { key: 'search', href: '/issues' },
  { key: 'action', href: '/action-initiatives' },
  { key: 'inbox', href: '/inbox', authRequired: true },
  { key: 'profile', href: '/profile', authRequired: true },
];

/** SVG icon components for each tab */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      {!active && <polyline points="9 22 9 12 15 12 15 22" />}
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function renderIcon(key: NavItem['key'], active: boolean) {
  switch (key) {
    case 'home':
      return <HomeIcon active={active} />;
    case 'search':
      return <SearchIcon active={active} />;
    case 'inbox':
      return <InboxIcon active={active} />;
    case 'profile':
      return <ProfileIcon active={active} />;
    case 'action':
      // Central CTA uses the QR logo
      return null;
    default:
      return null;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const t = useTranslations('MobileNav');
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count for inbox badge
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    async function fetchUnread() {
      try {
        const res = await fetch('/api/users/me/nav-context');
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUnreadCount(data.data?.unreadCount ?? 0);
        }
      } catch {
        // Progressive enhancement — ignore failures
      }
    }

    fetchUnread();
    return () => {
      cancelled = true;
    };
  }, [status]);

  function isActive(item: NavItem): boolean {
    if (item.key === 'home') return pathname === '/';
    if (item.key === 'search') return pathname.startsWith('/issues');
    return pathname.startsWith(item.href);
  }

  return (
    <>
      {/* Mobile search overlay */}
      {searchOpen && <NavSearch mobile onClose={() => setSearchOpen(false)} />}

      <nav
        role="navigation"
        aria-label={t('navLabel')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const isSearch = item.key === 'search';
            const isAction = item.key === 'action';
            const isInbox = item.key === 'inbox';
            const isProfile = item.key === 'profile';

            // Auth-gated items: show as dimmed / sign-in link when not authenticated
            const isAuthenticated = status === 'authenticated' && !!session?.user;
            const authGated = item.authRequired && !isAuthenticated;

            // Search tab opens overlay instead of navigating
            if (isSearch) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                  aria-label={t('search')}
                >
                  <SearchIcon active={active} />
                  <span className="truncate">{t('search')}</span>
                </button>
              );
            }

            // Central action CTA with logo
            if (isAction) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
                    active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                  aria-label={t('action')}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      active
                        ? 'bg-blue-600 ring-2 ring-blue-600/30 dark:bg-blue-500 dark:ring-blue-500/30'
                        : 'bg-blue-600 dark:bg-blue-500'
                    }`}
                  >
                    <Image
                      src="/logo-192.png"
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full"
                    />
                  </span>
                  <span className="truncate">{t('action')}</span>
                </Link>
              );
            }

            // Auth-gated tabs redirect to sign-in
            const href = authGated ? '/auth/signin' : item.href;

            return (
              <Link
                key={item.key}
                href={href}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : authGated
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                aria-label={t(item.key)}
              >
                {renderIcon(item.key, active)}
                <span className="truncate">{t(item.key)}</span>

                {/* Inbox unread badge */}
                {isInbox && isAuthenticated && unreadCount > 0 && (
                  <span className="absolute end-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}

                {/* Profile: show user initial when authenticated */}
                {isProfile && isAuthenticated && session?.user?.name && (
                  <span className="sr-only">
                    ({session.user.name.charAt(0).toUpperCase()})
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
