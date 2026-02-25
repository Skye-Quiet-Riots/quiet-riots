import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send an email via Resend.
 * Returns true if sent successfully, false if no API key or send failed.
 * Graceful degradation — never throws.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const from = process.env.EMAIL_FROM || 'noreply@quietriots.com';

  try {
    await resend.emails.send({ from, to, subject, html });
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}
