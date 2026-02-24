/**
 * Custom Auth.js adapter for Turso/libSQL.
 *
 * Maps Auth.js CRUD operations to our existing tables:
 *   users, accounts, verification_tokens
 *
 * Auth.js sessions table is NOT used — we use JWT strategy.
 */
import type { Adapter, AdapterUser, AdapterAccount } from '@auth/core/adapters';
import { getDb } from './db';
import { generateId } from './uuid';

function toAdapterUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    name: (row.display_name as string) || (row.name as string) || null,
    email: row.email as string,
    emailVerified: row.email_verified === 1 ? new Date() : null,
    image: (row.avatar_url as string) || null,
  };
}

export function TursoAdapter(): Adapter {
  const db = getDb();

  return {
    async createUser(data) {
      const id = generateId();
      const email = data.email.toLowerCase().trim();
      const name = data.name || email.split('@')[0];

      await db.execute({
        sql: `INSERT INTO users (id, name, email, email_verified, display_name)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, name, email, data.emailVerified ? 1 : 0, data.name || null],
      });

      const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      return toAdapterUser(result.rows[0] as unknown as Record<string, unknown>);
    },

    async getUser(id) {
      const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      if (!result.rows[0]) return null;
      return toAdapterUser(result.rows[0] as unknown as Record<string, unknown>);
    },

    async getUserByEmail(email) {
      const normalized = email.toLowerCase().trim();
      const result = await db.execute({
        sql: "SELECT * FROM users WHERE LOWER(email) = ? AND status != 'deleted'",
        args: [normalized],
      });
      if (!result.rows[0]) return null;
      return toAdapterUser(result.rows[0] as unknown as Record<string, unknown>);
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const result = await db.execute({
        sql: `SELECT u.* FROM users u
              JOIN accounts a ON u.id = a.user_id
              WHERE a.provider = ? AND a.provider_account_id = ?
              AND u.status != 'deleted'`,
        args: [provider, providerAccountId],
      });
      if (!result.rows[0]) return null;
      return toAdapterUser(result.rows[0] as unknown as Record<string, unknown>);
    },

    async updateUser(data) {
      const sets: string[] = [];
      const args: (string | number | null)[] = [];

      if (data.name !== undefined) {
        sets.push('display_name = ?');
        args.push(data.name);
      }
      if (data.email !== undefined) {
        sets.push('email = ?');
        args.push(data.email.toLowerCase().trim());
      }
      if (data.emailVerified !== undefined) {
        sets.push('email_verified = ?');
        args.push(data.emailVerified ? 1 : 0);
      }
      if (data.image !== undefined) {
        sets.push('avatar_url = ?');
        args.push(data.image);
      }

      if (sets.length > 0) {
        args.push(data.id!);
        await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args });
      }

      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [data.id!],
      });
      return toAdapterUser(result.rows[0] as unknown as Record<string, unknown>);
    },

    async deleteUser(id) {
      // Soft delete — mark as deleted, don't remove the row
      await db.execute({
        sql: "UPDATE users SET status = 'deleted', deactivated_at = datetime('now') WHERE id = ?",
        args: [id],
      });
    },

    async linkAccount(data) {
      const id = generateId();
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, provider, provider_account_id, type,
              access_token, refresh_token, expires_at, token_type, scope, id_token)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          data.userId,
          data.provider,
          data.providerAccountId,
          data.type,
          data.access_token ?? null,
          data.refresh_token ?? null,
          data.expires_at ?? null,
          data.token_type ?? null,
          data.scope ?? null,
          data.id_token ?? null,
        ],
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db.execute({
        sql: 'DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?',
        args: [provider, providerAccountId],
      });
    },

    async getAccount(providerAccountId, provider) {
      const result = await db.execute({
        sql: 'SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?',
        args: [provider, providerAccountId],
      });
      if (!result.rows[0]) return null;
      const row = result.rows[0] as unknown as Record<string, unknown>;
      return {
        id: row.id as string,
        userId: row.user_id as string,
        provider: row.provider as string,
        providerAccountId: row.provider_account_id as string,
        type: row.type as AdapterAccount['type'],
        access_token: (row.access_token as string) ?? undefined,
        refresh_token: (row.refresh_token as string) ?? undefined,
        expires_at: (row.expires_at as number) ?? undefined,
        token_type: (row.token_type as string) ?? undefined,
        scope: (row.scope as string) ?? undefined,
        id_token: (row.id_token as string) ?? undefined,
      } as AdapterAccount;
    },

    // Session methods — not used (JWT strategy), but required by interface
    async createSession() {
      throw new Error('createSession not implemented — using JWT strategy');
    },
    async getSessionAndUser() {
      return null;
    },
    async updateSession() {
      return null;
    },
    async deleteSession() {},

    // Verification tokens (magic links)
    async createVerificationToken(data) {
      await db.execute({
        sql: 'INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)',
        args: [data.identifier, data.token, data.expires.toISOString()],
      });
      return data;
    },

    async useVerificationToken({ identifier, token }) {
      const result = await db.execute({
        sql: 'SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token],
      });
      if (!result.rows[0]) return null;

      const row = result.rows[0] as unknown as Record<string, unknown>;

      // Delete the token after use (one-time)
      await db.execute({
        sql: 'DELETE FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token],
      });

      return {
        identifier: row.identifier as string,
        token: row.token as string,
        expires: new Date(row.expires as string),
      };
    },
  };
}
