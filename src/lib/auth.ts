/**
 * Auth.js v5 configuration.
 *
 * Providers: Google, Facebook, email magic link (Resend).
 * Session strategy: JWT (stateless, works across web + future native apps).
 * Custom adapter: TursoAdapter maps to our existing users/accounts/verification_tokens tables.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import Resend from 'next-auth/providers/resend';
import { TursoAdapter } from './auth-adapter';
import { getDb } from './db';
import { sendVerificationRequest } from './magic-link-email';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: TursoAdapter(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Only request profile + email, not offline access
      authorization: { params: { access_type: 'online' } },
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'Quiet Riots <noreply@quietriots.com>',
      sendVerificationRequest,
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check if the user account is deactivated (30-day deletion grace period)
      const db = getDb();
      const result = await db.execute({
        sql: "SELECT status FROM users WHERE LOWER(email) = ? AND status != 'deleted'",
        args: [user.email.toLowerCase().trim()],
      });

      if (result.rows[0]) {
        const status = result.rows[0].status as string;
        if (status === 'deactivated') {
          // Reactivate the account — user is trying to sign in during grace period
          await db.execute({
            sql: "UPDATE users SET status = 'active', deactivated_at = NULL WHERE LOWER(email) = ?",
            args: [user.email.toLowerCase().trim()],
          });
        }
      }

      // If signing in via OAuth, auto-verify email
      if (account?.provider && account.provider !== 'resend') {
        const emailNorm = user.email.toLowerCase().trim();
        await db.execute({
          sql: 'UPDATE users SET email_verified = 1 WHERE LOWER(email) = ? AND email_verified = 0',
          args: [emailNorm],
        });
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      // On initial sign-in, attach user ID and session version
      if (user?.id) {
        token.sub = user.id;

        const db = getDb();
        const result = await db.execute({
          sql: 'SELECT session_version FROM users WHERE id = ?',
          args: [user.id],
        });
        if (result.rows[0]) {
          token.session_version = result.rows[0].session_version as number;
        }
      }

      // On session update, refresh session version
      if (trigger === 'update') {
        const db = getDb();
        const result = await db.execute({
          sql: 'SELECT session_version FROM users WHERE id = ?',
          args: [token.sub as string],
        });
        if (result.rows[0]) {
          token.session_version = result.rows[0].session_version as number;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }

      // Validate session_version and fetch avatar
      if (token.sub) {
        const db = getDb();
        const result = await db.execute({
          sql: 'SELECT session_version, avatar_url FROM users WHERE id = ?',
          args: [token.sub as string],
        });
        if (result.rows[0]) {
          // Check session version
          if (token.session_version !== undefined) {
            const currentVersion = result.rows[0].session_version as number;
            if (currentVersion !== token.session_version) {
              session.user = {} as typeof session.user;
              return session;
            }
          }
          // Attach avatar URL to session
          const avatarUrl = result.rows[0].avatar_url as string | null;
          if (avatarUrl) {
            session.user.image = avatarUrl;
          }
        }
      }

      return session;
    },
  },

  // Minimal JWT payload — no PII in the token
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Trust proxy headers (Vercel)
  trustHost: true,
});
