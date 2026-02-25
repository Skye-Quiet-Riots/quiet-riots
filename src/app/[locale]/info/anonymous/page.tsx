import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AnonymousInfoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AnonymousInfo');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p>{t('intro')}</p>

        <h2>{t('choosingTitle')}</h2>
        <p>{t('choosingIntro')}</p>
        <ul>
          <li>{t('choosingHidden')}</li>
          <li>{t('choosingBadge')}</li>
          <li>{t('choosingGuides')}</li>
          <li>{t('choosingChange')}</li>
        </ul>

        <h2>{t('whyTitle')}</h2>
        <p>{t('whyIntro')}</p>
        <ul>
          <li>{t('whySensitive')}</li>
          <li>{t('whyWork')}</li>
          <li>{t('whyCause')}</li>
          <li>{t('whyPrivacy')}</li>
        </ul>

        <h2>{t('changingTitle')}</h2>
        <p>{t('changingP1')}</p>
      </div>
    </div>
  );
}
