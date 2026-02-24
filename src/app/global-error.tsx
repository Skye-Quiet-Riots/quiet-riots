'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Inline translations for the global error page — this component renders outside
// the i18n provider chain, so we can't use useTranslations().
const translations: Record<string, { title: string; description: string; tryAgain: string }> = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Our team has been notified.',
    tryAgain: 'Try again',
  },
  es: {
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado. Nuestro equipo ha sido notificado.',
    tryAgain: 'Intentar de nuevo',
  },
  fr: {
    title: 'Une erreur est survenue',
    description: "Une erreur inattendue s'est produite. Notre équipe a été notifiée.",
    tryAgain: 'Réessayer',
  },
  de: {
    title: 'Etwas ist schiefgelaufen',
    description: 'Ein unerwarteter Fehler ist aufgetreten. Unser Team wurde benachrichtigt.',
    tryAgain: 'Erneut versuchen',
  },
  pt: {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
    tryAgain: 'Tentar novamente',
  },
  ja: {
    title: '問題が発生しました',
    description: '予期しないエラーが発生しました。チームに通知されました。',
    tryAgain: 'もう一度試す',
  },
  ar: {
    title: 'حدث خطأ ما',
    description: 'حدث خطأ غير متوقع. تم إخطار فريقنا.',
    tryAgain: 'حاول مرة أخرى',
  },
  zh: {
    title: '出了点问题',
    description: '发生了意外错误。我们的团队已收到通知。',
    tryAgain: '重试',
  },
  hi: {
    title: 'कुछ गलत हो गया',
    description: 'एक अप्रत्याशित त्रुटि हुई। हमारी टीम को सूचित किया गया है।',
    tryAgain: 'पुनः प्रयास करें',
  },
  ko: {
    title: '문제가 발생했습니다',
    description: '예상치 못한 오류가 발생했습니다. 팀에 알림이 전송되었습니다.',
    tryAgain: '다시 시도',
  },
};

function getLocaleFromUrl(): string {
  if (typeof window === 'undefined') return 'en';
  const segments = window.location.pathname.split('/');
  // URL: /en/issues or /fr/profile — locale is the first segment
  return segments[1] || 'en';
}

function getStrings(locale: string) {
  // Try exact match, then base language (e.g., 'pt-BR' → 'pt', 'zh-CN' → 'zh')
  return translations[locale] || translations[locale.split('-')[0]] || translations.en;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = getLocaleFromUrl();
  const t = getStrings(locale);
  const dir = ['ar', 'he', 'fa'].includes(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={locale} dir={dir}>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            padding: '1.5rem',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- global-error renders outside Next.js app tree */}
          <img
            src="/logo-192.png"
            alt="Quiet Riots"
            width={64}
            height={64}
            style={{ marginBottom: '1rem' }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{t.title}</h1>
          <p style={{ marginTop: '0.5rem', color: '#71717a' }}>{t.description}</p>
          <button
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.5rem',
              borderRadius: '9999px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {t.tryAgain}
          </button>
        </div>
      </body>
    </html>
  );
}
