import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Image
            src="/logo-192.png"
            alt="Quiet Riots logo"
            width={20}
            height={20}
            className="inline-block"
          />{' '}
          {t('mission')}
        </p>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">{t('powered')}</p>
      </div>
    </footer>
  );
}
