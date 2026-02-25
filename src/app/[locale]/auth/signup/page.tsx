import { setRequestLocale } from 'next-intl/server';
import { SignUpForm } from './signup-form';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignUpForm />;
}
