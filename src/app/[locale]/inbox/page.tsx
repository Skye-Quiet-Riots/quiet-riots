import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { getMessages, getUnreadCount } from '@/lib/queries/messages';
import { PageHeader } from '@/components/layout/page-header';
import { InboxList } from '@/components/interactive/inbox-list';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function InboxPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Inbox');

  const userId = await getSession();

  if (!userId) {
    redirect(`/${locale}/auth/signin`);
  }

  const [messages, unreadCount] = await Promise.all([
    getMessages(userId, { limit: 50 }),
    getUnreadCount(userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={t('title')}
        subtitle={unreadCount > 0 ? t('unread', { count: unreadCount }) : t('allCaughtUp')}
      />
      <InboxList initialMessages={messages} initialUnreadCount={unreadCount} />
    </div>
  );
}
