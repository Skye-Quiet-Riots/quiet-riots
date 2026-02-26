import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { createHmac } from 'crypto';
import { redirect } from 'next/navigation';
import { SharePasswordGate } from '@/components/interactive/share-password-gate';

export const dynamic = 'force-dynamic';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ShareLayout({ children, params }: Props) {
  const { locale } = await params;
  const userId = await getSession();

  if (!userId) {
    redirect(`/${locale}/auth/signin`);
  }

  // Verify the share access cookie
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get('qr_share_access');

  if (!accessCookie?.value) {
    return <SharePasswordGate />;
  }

  // Verify HMAC — cookie value must match HMAC(userId, password)
  const password = process.env.SHARE_ACCESS_PASSWORD;
  if (!password) {
    return <SharePasswordGate />;
  }

  const expectedHmac = createHmac('sha256', password).update(userId).digest('hex');
  if (accessCookie.value !== expectedHmac) {
    return <SharePasswordGate />;
  }

  return <>{children}</>;
}
