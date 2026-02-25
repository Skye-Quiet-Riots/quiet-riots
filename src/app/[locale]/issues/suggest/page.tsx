import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { PageHeader } from '@/components/layout/page-header';
import { SuggestionForm } from '@/components/interactive/suggestion-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function SuggestIssuePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('SuggestPage');

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const sp = await searchParams;
  const prefill = sp.q || '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        breadcrumbs={[
          { label: t('breadcrumbIssues'), href: '/issues' },
          { label: t('breadcrumbSuggest') },
        ]}
      />
      <SuggestionForm prefillText={prefill} />
    </div>
  );
}
