'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSelector } from '@/components/interactive/language-selector';

const linkKeys = ['issues', 'assistants', 'organisations', 'wallet', 'profile'] as const;
const linkHrefs: Record<(typeof linkKeys)[number], string> = {
  issues: '/issues',
  assistants: '/assistants',
  organisations: '/organisations',
  wallet: '/wallet',
  profile: '/profile',
};

export function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations('Nav');

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image src="/logo-192.png" alt="Quiet Riots logo" width={28} height={28} />
          <span>Quiet Riots</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          {linkKeys.map((key) => (
            <Link
              key={key}
              href={linkHrefs[key]}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(linkHrefs[key])
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {t(key)}
            </Link>
          ))}
          <LanguageSelector />
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col gap-1 p-2 sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={t('toggleMenu')}
        >
          <span
            className={`block h-0.5 w-5 bg-zinc-600 transition-transform dark:bg-zinc-300 ${menuOpen ? 'translate-y-1.5 rotate-45' : ''}`}
          />
          <span
            className={`block h-0.5 w-5 bg-zinc-600 transition-opacity dark:bg-zinc-300 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-5 bg-zinc-600 transition-transform dark:bg-zinc-300 ${menuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-zinc-200 px-4 py-3 sm:hidden dark:border-zinc-800">
          {linkKeys.map((key) => (
            <Link
              key={key}
              href={linkHrefs[key]}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-medium ${
                pathname.startsWith(linkHrefs[key])
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {t(key)}
            </Link>
          ))}
          <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <LanguageSelector />
          </div>
        </div>
      )}
    </nav>
  );
}
