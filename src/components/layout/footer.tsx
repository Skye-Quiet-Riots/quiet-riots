import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand column */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Image
                src="/logo-192.png"
                alt="Quiet Riots logo"
                width={28}
                height={28}
                className="inline-block"
              />
              <span
                className="text-xl font-extrabold tracking-tight"
                style={{ color: 'var(--brand-blue)' }}
              >
                Quiet Riots
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('mission')}</p>
          </div>

          {/* Quick Links column */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/issues"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('browseIssues')}
                </Link>
              </li>
              <li>
                <Link
                  href="/organisations"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('browseOrganisations')}
                </Link>
              </li>
              <li>
                <Link
                  href="/assistants"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('meetAssistants')}
                </Link>
              </li>
              <li>
                <Link
                  href="/action-initiatives"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('actionInitiatives')}
                </Link>
              </li>
            </ul>
          </div>

          {/* About column */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('about')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/info/how-it-works"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('howItWorks')}
                </Link>
              </li>
              <li>
                <Link
                  href="/info/about"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/info/privacy"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/info/terms"
                  className="text-sm text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  {t('terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-zinc-200 pt-6 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">{t('powered')}</p>
        </div>
      </div>
    </footer>
  );
}
