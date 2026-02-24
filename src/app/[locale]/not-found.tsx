import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <Image src="/logo-192.png" alt="Quiet Riots" width={64} height={64} className="mb-4" />
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">{t('description')}</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}
