import { setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RejectionReasonsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Why Quiet Riots Get Rejected"
        subtitle="Understanding the review process"
      />

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p>
          Every suggestion for a new Quiet Riot is reviewed by a Setup Guide to ensure it fits the
          platform and can make a real difference. Here are the reasons a suggestion might not be
          approved:
        </p>

        <h2>Close to an Existing Quiet Riot</h2>
        <p>
          If your suggestion is very similar to a Quiet Riot that already exists, we&apos;ll merge
          your suggestion into the existing one. This keeps the community focused and prevents
          fragmentation. The more people behind one Quiet Riot, the bigger the impact.
        </p>
        <p>
          When this happens, you&apos;ll be automatically added to the existing Quiet Riot so you
          can start taking action right away.
        </p>

        <h2>About People, Not Issues</h2>
        <p>
          Quiet Riots are about shared <strong>issues</strong>, not about targeting individuals. We
          focus on systemic problems — things like poor broadband, rising energy costs, or
          inadequate healthcare — rather than personal grievances with specific people.
        </p>
        <p>
          If you&apos;re frustrated with a specific person or public figure, try framing it as the
          underlying issue instead. For example, instead of targeting a CEO, suggest a Quiet Riot
          about the company&apos;s practices.
        </p>

        <h2>Illegal Subject</h2>
        <p>
          We can&apos;t host Quiet Riots that promote or organise illegal activities. This includes
          anything that violates applicable laws, promotes violence, or could put people at risk.
        </p>

        <h2>Other</h2>
        <p>
          Occasionally a suggestion might not fit for another reason — perhaps it&apos;s too vague,
          or the Setup Guide needs more information. In these cases, you&apos;ll receive a message
          explaining why and what you can do next.
        </p>

        <hr />

        <h2>What Happens Next?</h2>
        <p>If your suggestion is rejected, you can always:</p>
        <ul>
          <li>
            <strong>Reframe and try again</strong> — adjust the name or description to better fit
            the guidelines
          </li>
          <li>
            <strong>Join an existing Quiet Riot</strong> — your issue might already be covered
          </li>
          <li>
            <strong>Reply to the Setup Guide</strong> — if you think the rejection was a mistake,
            send a message explaining your case
          </li>
        </ul>
      </div>
    </div>
  );
}
