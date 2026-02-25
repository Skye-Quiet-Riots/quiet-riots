/**
 * Custom sendVerificationRequest for Auth.js Resend provider.
 * Sends a branded, locale-aware magic link email.
 */

import type { EmailConfig } from '@auth/core/providers';

/** Translations for the magic link email — keyed by locale */
type EmailStrings = {
  emailSubject: string;
  emailHeading: string;
  emailBody: string;
  emailButton: string;
  emailIgnore: string;
};

/**
 * Extract locale from the callbackUrl embedded in the verification URL.
 * Auth.js constructs: /api/auth/callback/resend?callbackUrl=/fr/onboard&token=...&email=...
 * The callbackUrl starts with /{locale}/...
 */
function extractLocale(verificationUrl: string): string {
  try {
    const url = new URL(verificationUrl);
    const callbackUrl = url.searchParams.get('callbackUrl') || '';
    // callbackUrl is like "/fr" or "/fr/onboard"
    const match = callbackUrl.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)/);
    if (match) return match[1];
  } catch {
    // ignore parse errors
  }
  return 'en';
}

/** Load email strings for a given locale, falling back to English */
async function loadEmailStrings(locale: string): Promise<EmailStrings> {
  const defaults: EmailStrings = {
    emailSubject: 'Sign in to Quiet Riots',
    emailHeading: 'Sign in to Quiet Riots',
    emailBody: 'Click the button below to sign in to your account. This link expires in 24 hours.',
    emailButton: 'Sign in',
    emailIgnore: 'If you did not request this email, you can safely ignore it.',
  };

  try {
    // Try locale-specific messages first, then English
    let messages;
    if (locale !== 'en') {
      try {
        messages = (await import(`../../messages/${locale}.json`)).default;
      } catch {
        messages = (await import('../../messages/en.json')).default;
      }
    } else {
      messages = (await import('../../messages/en.json')).default;
    }

    const auth = messages?.Auth;
    if (!auth) return defaults;

    return {
      emailSubject: auth.emailSubject || defaults.emailSubject,
      emailHeading: auth.emailHeading || defaults.emailHeading,
      emailBody: auth.emailBody || defaults.emailBody,
      emailButton: auth.emailButton || defaults.emailButton,
      emailIgnore: auth.emailIgnore || defaults.emailIgnore,
    };
  } catch {
    return defaults;
  }
}

/** Render the branded HTML email */
function renderEmail(url: string, strings: EmailStrings): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <img src="https://www.quietriots.com/logo-192.png" alt="Quiet Riots" width="48" height="48" style="border-radius:50%;">
        </td></tr>
        <tr><td style="padding:24px 32px 0;text-align:center;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">${strings.emailHeading}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 0;text-align:center;">
          <p style="margin:0;font-size:14px;line-height:22px;color:#71717a;">${strings.emailBody}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:12px 32px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${strings.emailButton}</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">${strings.emailIgnore}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain text fallback */
function renderText(url: string, strings: EmailStrings): string {
  return `${strings.emailHeading}\n\n${strings.emailBody}\n\n${url}\n\n${strings.emailIgnore}\n`;
}

/** Custom sendVerificationRequest — branded + i18n */
export const sendVerificationRequest: EmailConfig['sendVerificationRequest'] = async (params) => {
  const { identifier: to, provider, url } = params;
  const locale = extractLocale(url);
  const strings = await loadEmailStrings(locale);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: strings.emailSubject,
      html: renderEmail(url, strings),
      text: renderText(url, strings),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Resend error: ${JSON.stringify(body)}`);
  }
};

// Exported for testing
export { extractLocale, loadEmailStrings, renderEmail, renderText };
