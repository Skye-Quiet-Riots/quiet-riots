import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
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

  const userId = await getSession();
  if (!userId) redirect(`/${locale}/auth/signin`);

  const sp = await searchParams;
  const prefill = sp.q || '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Suggest a New Quiet Riot"
        subtitle="Can't find your issue? Suggest a new Quiet Riot and we'll review it."
        breadcrumbs={[{ label: 'Issues', href: '/issues' }, { label: 'Suggest' }]}
      />
      <SuggestionForm prefillText={prefill} />
    </div>
  );
}
