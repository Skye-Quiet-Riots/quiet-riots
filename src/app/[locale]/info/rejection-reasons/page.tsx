import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RejectionReasonsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('RejectionReasons');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p>{t('intro')}</p>

        <h2>{t('closeToExistingTitle')}</h2>
        <p>{t('closeToExistingP1')}</p>
        <p>{t('closeToExistingP2')}</p>

        <h2>{t('aboutPeopleTitle')}</h2>
        <p>{t('aboutPeopleP1')}</p>
        <p>{t('aboutPeopleP2')}</p>

        <h2>{t('illegalTitle')}</h2>
        <p>{t('illegalP1')}</p>

        <h2>{t('otherTitle')}</h2>
        <p>{t('otherP1')}</p>

        <hr />

        <h2>{t('whatNextTitle')}</h2>
        <p>{t('whatNextIntro')}</p>
        <ul>
          <li>{t('reframe')}</li>
          <li>{t('joinExisting')}</li>
          <li>{t('replyGuide')}</li>
        </ul>
      </div>
    </div>
  );
}
