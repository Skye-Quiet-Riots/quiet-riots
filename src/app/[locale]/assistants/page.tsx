import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAllAssistants } from '@/lib/queries/assistants';
import { PageHeader } from '@/components/layout/page-header';
import { AssistantCard } from '@/components/cards/assistant-card';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AssistantsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Assistants');

  const assistants = await getAllAssistants();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: assistants.length })} />

      {assistants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant) => (
            <AssistantCard key={assistant.id} assistant={assistant} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-zinc-500 dark:text-zinc-400">{t('noResults')}</p>
        </div>
      )}
    </div>
  );
}
