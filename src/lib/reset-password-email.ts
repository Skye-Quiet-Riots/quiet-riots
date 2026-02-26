/**
 * Password reset email template.
 * Same branded pattern as magic-link-email.ts, locale-aware.
 */

type ResetEmailStrings = {
  resetEmailSubject: string;
  resetEmailHeading: string;
  resetEmailBody: string;
  resetEmailButton: string;
  resetEmailIgnore: string;
};

const defaults: ResetEmailStrings = {
  resetEmailSubject: 'Reset your Quiet Riots password',
  resetEmailHeading: 'Reset your password',
  resetEmailBody: 'Click the button below to reset your password. This link expires in 1 hour.',
  resetEmailButton: 'Reset password',
  resetEmailIgnore: 'If you did not request a password reset, you can safely ignore this email.',
};

/** Load email strings for a given locale, falling back to English */
export async function loadResetEmailStrings(locale: string): Promise<ResetEmailStrings> {
  try {
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
      resetEmailSubject: auth.resetEmailSubject || defaults.resetEmailSubject,
      resetEmailHeading: auth.resetEmailHeading || defaults.resetEmailHeading,
      resetEmailBody: auth.resetEmailBody || defaults.resetEmailBody,
      resetEmailButton: auth.resetEmailButton || defaults.resetEmailButton,
      resetEmailIgnore: auth.resetEmailIgnore || defaults.resetEmailIgnore,
    };
  } catch {
    return defaults;
  }
}

/** Render the branded HTML email */
export function renderResetEmail(url: string, strings: ResetEmailStrings): string {
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
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">${strings.resetEmailHeading}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 0;text-align:center;">
          <p style="margin:0;font-size:14px;line-height:22px;color:#71717a;">${strings.resetEmailBody}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:12px 32px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${strings.resetEmailButton}</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">${strings.resetEmailIgnore}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain text fallback */
export function renderResetText(url: string, strings: ResetEmailStrings): string {
  return `${strings.resetEmailHeading}\n\n${strings.resetEmailBody}\n\n${url}\n\n${strings.resetEmailIgnore}\n`;
}
