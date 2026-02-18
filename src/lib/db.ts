import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

/** Default query timeout in milliseconds (5 seconds) */
export const DEFAULT_QUERY_TIMEOUT_MS = 5_000;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:quiet-riots.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    client = createClient({
      url,
      authToken,
      concurrency: 10,
    });
  }
  return client;
}

/**
 * Execute a database query with a timeout.
 * Rejects with an error if the query takes longer than `timeoutMs`.
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

// Test helpers — inject/reset the database singleton for isolated testing
export function _setTestDb(testClient: Client): void {
  client = testClient;
}

export function _resetDb(): void {
  client = null;
}
