import { setRequestLocale } from 'next-intl/server';
import { OnboardForm } from './onboard-form';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OnboardForm />;
}
