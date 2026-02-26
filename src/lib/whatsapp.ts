import { execFile } from 'child_process';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * @deprecated Use the WhatsApp delivery queue instead (messages table + polling script).
 * This function calls /opt/homebrew/bin/openclaw directly, which only works on the local
 * Mac — it silently fails on Vercel serverless functions. For production notifications,
 * use `sendNotification()` from `src/lib/queries/messages.ts` which queues messages for
 * the local polling script (scripts/deliver-messages.sh) to deliver.
 *
 * Kept for the OTP delivery script and potential future Twilio migration.
 *
 * Returns true if sent, false on failure.
 * Graceful degradation — never throws.
 *
 * The OpenClaw binary is at /opt/homebrew/bin/openclaw.
 * Uses `execFile` (not `exec`) to prevent shell injection.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  // No-op in test environment
  if (process.env.NODE_ENV === 'test') return true;

  // Validate E.164 format
  if (!E164_REGEX.test(phone)) {
    console.error('WhatsApp push: invalid phone format:', phone);
    return false;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        '/opt/homebrew/bin/openclaw',
        ['agent', '--to', phone, '--message', message, '--deliver'],
        { timeout: 30_000 },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    return true;
  } catch (error) {
    console.error('WhatsApp push failed:', error);
    return false;
  }
}
