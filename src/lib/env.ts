import { z } from 'zod';

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL is required'),
  TURSO_AUTH_TOKEN: z.string().min(1, 'TURSO_AUTH_TOKEN is required'),
  BOT_API_KEY: z
    .string()
    .min(1, 'BOT_API_KEY is required — bot auth will reject all requests without it')
    .refine((key) => key !== 'qr-bot-dev-key-2026', {
      message:
        "BOT_API_KEY is set to the dev fallback key — production requires a proper secret (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\")",
    }),
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required for Auth.js JWT signing'),
});

/**
 * Validate required environment variables.
 * Call at app startup to fail fast if config is missing.
 * Skips validation in test environments.
 */
export function validateEnv() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;

  // Local dev can use a SQLite file — skip validation when no Turso URL is set
  if (!process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL.startsWith('file:')) return;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`\n❌ Missing environment variables:\n${errors}\n`);
    throw new Error('Missing required environment variables');
  }
}
