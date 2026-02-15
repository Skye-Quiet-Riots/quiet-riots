import { createClient, type Client } from '@libsql/client';
import { _setTestDb, _resetDb } from '@/lib/db';
import { createTables, dropTables } from '@/lib/schema';

let testClient: Client;

export async function setupTestDb(): Promise<Client> {
  testClient = createClient({ url: 'file::memory:' });
  _setTestDb(testClient);
  await createTables();
  return testClient;
}

export async function teardownTestDb(): Promise<void> {
  await dropTables();
  _resetDb();
}
