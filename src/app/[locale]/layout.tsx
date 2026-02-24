import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, rtlLocales } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { NavBar } from '@/components/layout/nav-bar';
import { Footer } from '@/components/layout/footer';
import { CookieConsent } from '@/components/interactive/cookie-consent';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const dir = rtlLocales.has(locale as Locale) ? 'rtl' : 'ltr';

  return (
    <div dir={dir}>
      <NextIntlClientProvider>
        <NavBar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <CookieConsent />
      </NextIntlClientProvider>
    </div>
  );
}
