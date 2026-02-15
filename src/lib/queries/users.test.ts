import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getUserById,
  getUserByEmail,
  getUserByPhone,
  createUser,
  updateUser,
  getUserIssues,
  joinIssue,
  leaveIssue,
  hasJoinedIssue,
} from './users';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getUserById', () => {
  it('returns user when found', async () => {
    const user = await getUserById(1);
    expect(user).not.toBeNull();
    expect(user!.name).toBe('Sarah K.');
    expect(user!.email).toBe('sarah@example.com');
  });

  it('returns null for missing user', async () => {
    const user = await getUserById(999);
    expect(user).toBeNull();
  });
});

describe('getUserByEmail', () => {
  it('returns user when found', async () => {
    const user = await getUserByEmail('sarah@example.com');
    expect(user).not.toBeNull();
    expect(user!.name).toBe('Sarah K.');
  });

  it('returns null for missing email', async () => {
    const user = await getUserByEmail('nobody@example.com');
    expect(user).toBeNull();
  });
});

describe('getUserByPhone', () => {
  it('returns user when found', async () => {
    const user = await getUserByPhone('+5511999999999');
    expect(user).not.toBeNull();
    expect(user!.name).toBe('Marcio R.');
  });

  it('returns null for unknown phone', async () => {
    const user = await getUserByPhone('+0000000000');
    expect(user).toBeNull();
  });
});

describe('createUser', () => {
  it('creates user with defaults', async () => {
    const user = await createUser({
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.time_available).toBe('10min');
    expect(user.skills).toBe('');
    expect(user.phone).toBeNull();
  });

  it('creates user with all fields', async () => {
    const user = await createUser({
      name: 'Full User',
      email: 'full@example.com',
      phone: '+441234567890',
      time_available: '1hr+',
      skills: 'coding,design',
    });
    expect(user.phone).toBe('+441234567890');
    expect(user.time_available).toBe('1hr+');
    expect(user.skills).toBe('coding,design');
  });
});

describe('updateUser', () => {
  it('updates specific fields', async () => {
    const updated = await updateUser(1, { name: 'Sarah Updated' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Sarah Updated');
    expect(updated!.email).toBe('sarah@example.com'); // unchanged
  });

  it('returns existing user when no fields provided', async () => {
    const user = await updateUser(1, {});
    expect(user).not.toBeNull();
    expect(user!.id).toBe(1);
  });

  it('returns null for missing user', async () => {
    const user = await updateUser(999, { name: 'Ghost' });
    expect(user).toBeNull();
  });
});

describe('getUserIssues', () => {
  it('returns joined issues with details', async () => {
    const issues = await getUserIssues(1);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    // Sarah joined Rail Cancellations
    const railIssue = issues.find((i) => i.issue_id === 1);
    expect(railIssue).toBeDefined();
    expect(railIssue!.issue_name).toBe('Rail Cancellations');
  });

  it('returns empty array for user with no issues', async () => {
    // Create a user with no issues
    const user = await createUser({ name: 'Loner', email: 'loner@example.com' });
    const issues = await getUserIssues(user.id);
    expect(issues).toHaveLength(0);
  });
});

describe('joinIssue / leaveIssue / hasJoinedIssue', () => {
  it('joins a user to an issue', async () => {
    await joinIssue(1, 2); // Sarah joins Broadband Speed
    const joined = await hasJoinedIssue(1, 2);
    expect(joined).toBe(true);
  });

  it('is idempotent (INSERT OR IGNORE)', async () => {
    // Should not throw on duplicate
    await joinIssue(1, 2);
    const joined = await hasJoinedIssue(1, 2);
    expect(joined).toBe(true);
  });

  it('leaves an issue', async () => {
    await leaveIssue(1, 2);
    const joined = await hasJoinedIssue(1, 2);
    expect(joined).toBe(false);
  });

  it('hasJoinedIssue returns false when not joined', async () => {
    const joined = await hasJoinedIssue(1, 3);
    expect(joined).toBe(false);
  });
});
