'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface AuthGateProps {
  /** The action description shown when not authenticated (e.g., "join this Quiet Riot") */
  action: string;
  /** The wrapped content — rendered only when authenticated, or always with onClick intercepted */
  children: React.ReactNode;
  /** If true, render children always but show modal on click when not authenticated */
  mode?: 'wrap' | 'block';
}

/**
 * AuthGate — wraps interactive components that require authentication.
 *
 * In 'block' mode (default): shows a sign-in prompt instead of children when not logged in.
 * In 'wrap' mode: renders children but intercepts clicks to show a modal when not logged in.
 */
export function AuthGate({ action, children, mode = 'block' }: AuthGateProps) {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const t = useTranslations('AuthGate');
  const signInLinkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!session?.user?.id) {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
      }
    },
    [session],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!session?.user?.id && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
      }
    },
    [session],
  );

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowModal(false);
    }
  }, []);

  // Focus the sign-in link when the modal opens
  useEffect(() => {
    if (showModal && signInLinkRef.current) {
      signInLinkRef.current.focus();
    }
  }, [showModal]);

  // Loading state — show nothing to avoid flash
  if (status === 'loading') {
    return null;
  }

  // Authenticated — render children directly
  if (session?.user?.id) {
    return <>{children}</>;
  }

  // Block mode — show inline prompt
  if (mode === 'block') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t('signInTo', { action })}</p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {t('signIn')}
        </Link>
      </div>
    );
  }

  // Wrap mode — render children with click interceptor + modal
  return (
    <>
      <div onClick={handleClick} onKeyDown={handleKeyDown} role="presentation">
        {children}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onKeyDown={handleModalKeyDown}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-bold">{t('signInRequired')}</h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {t('signInToAction', { action })}
            </p>
            <div className="flex gap-3">
              <Link
                ref={signInLinkRef}
                href="/auth/signin"
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {t('signIn')}
              </Link>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t('cancel')}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              {t('noAccount')}{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('signUp')}
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
