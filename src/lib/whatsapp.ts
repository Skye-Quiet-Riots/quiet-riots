import { execFile } from 'child_process';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Send a proactive WhatsApp message via OpenClaw CLI.
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
