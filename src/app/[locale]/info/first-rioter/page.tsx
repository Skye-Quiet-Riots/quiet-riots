import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FirstRioterInfoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('FirstRioterInfo');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p>{t('intro')}</p>

        <h2>{t('whatTitle')}</h2>
        <p>{t('whatIntro')}</p>
        <ul>
          <li>{t('whatBadge')}</li>
          <li>{t('whatRecognition')}</li>
          <li>{t('whatJoined')}</li>
          <li>{t('whatNotifications')}</li>
        </ul>

        <h2>{t('responsibilitiesTitle')}</h2>
        <p>{t('responsibilitiesIntro')}</p>
        <ul>
          <li>{t('responsibilityChampion')}</li>
          <li>{t('responsibilityEvidence')}</li>
          <li>{t('responsibilityWelcome')}</li>
        </ul>

        <h2>{t('recognitionTitle')}</h2>
        <p>{t('recognitionIntro')}</p>
        <ul>
          <li>{t('recognitionPublic')}</li>
          <li>{t('recognitionAnonymous')}</li>
          <li>{t('recognitionChange')}</li>
        </ul>

        <h2>{t('howTitle')}</h2>
        <p>{t('howP1')}</p>
        <p>{t('howP2')}</p>
      </div>
    </div>
  );
}
