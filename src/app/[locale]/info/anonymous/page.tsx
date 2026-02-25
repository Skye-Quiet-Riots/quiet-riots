import { setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AnonymousInfoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Anonymous First Rioters" subtitle="What being anonymous means" />

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p>
          When someone starts a new Quiet Riot, they become the <strong>First Quiet Rioter</strong>.
          This is a badge of honour — the person who had the courage to speak up first.
        </p>

        <h2>Choosing to Stay Anonymous</h2>
        <p>
          Not everyone wants their name attached to an issue publicly. That&apos;s completely fine.
          When the First Quiet Rioter chooses to stay anonymous:
        </p>
        <ul>
          <li>Their name and profile picture are hidden from the issue page</li>
          <li>
            An anonymous badge is shown instead, so people know someone started it without knowing
            who
          </li>
          <li>The Setup Guides still know who started it (for moderation purposes)</li>
          <li>The First Rioter can change their mind later and choose to be publicly recognised</li>
        </ul>

        <h2>Why Stay Anonymous?</h2>
        <p>There are many valid reasons to stay anonymous:</p>
        <ul>
          <li>The issue is sensitive or controversial</li>
          <li>You work for a company related to the issue</li>
          <li>You prefer to let the cause speak for itself</li>
          <li>You simply value your privacy</li>
        </ul>

        <h2>Changing Your Mind</h2>
        <p>
          If you started a Quiet Riot anonymously but later decide you want to be recognised, you
          can update your preference at any time through your inbox or by messaging a Setup Guide.
        </p>
      </div>
    </div>
  );
}
