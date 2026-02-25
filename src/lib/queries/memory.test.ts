import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getUserMemories, saveMemory, deleteMemory } from './memory';
import { getDb } from '../db';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getUserMemories', () => {
  it('returns empty array for user with no memories', async () => {
    const memories = await getUserMemories('user-marcio');
    expect(memories).toEqual([]);
  });

  it('returns memories ordered by updated_at DESC', async () => {
    const db = getDb();
    // Insert with explicit timestamps for deterministic ordering
    await db.execute({
      sql: `INSERT INTO user_memory (id, user_id, memory_key, memory_value, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, '2026-01-01T00:00:00', '2026-01-01T00:00:00')`,
      args: ['mem-order-1', 'user-sarah', 'older_note', 'First', 'general'],
    });
    await db.execute({
      sql: `INSERT INTO user_memory (id, user_id, memory_key, memory_value, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, '2026-02-01T00:00:00', '2026-02-01T00:00:00')`,
      args: ['mem-order-2', 'user-sarah', 'newer_note', 'Second', 'general'],
    });

    const memories = await getUserMemories('user-sarah');
    expect(memories.length).toBeGreaterThanOrEqual(2);
    const olderIdx = memories.findIndex((m) => m.memory_key === 'older_note');
    const newerIdx = memories.findIndex((m) => m.memory_key === 'newer_note');
    expect(newerIdx).toBeLessThan(olderIdx);

    // Clean up
    await db.execute({
      sql: "DELETE FROM user_memory WHERE id IN ('mem-order-1','mem-order-2')",
      args: [],
    });
  });
});

describe('saveMemory', () => {
  it('creates a new memory', async () => {
    const mem = await saveMemory('user-sarah', 'test_key', 'test_value', 'preference');
    expect(mem.memory_key).toBe('test_key');
    expect(mem.memory_value).toBe('test_value');
    expect(mem.category).toBe('preference');
    expect(mem.user_id).toBe('user-sarah');
    expect(mem.id).toBeTruthy();
    expect(mem.created_at).toBeTruthy();
    expect(mem.updated_at).toBeTruthy();

    // Clean up
    await deleteMemory('user-sarah', 'test_key');
  });

  it('upserts when saving with the same key', async () => {
    await saveMemory('user-sarah', 'upsert_key', 'original', 'context');
    const updated = await saveMemory('user-sarah', 'upsert_key', 'updated', 'goal');
    expect(updated.memory_value).toBe('updated');
    expect(updated.category).toBe('goal');

    // Should still be only one row with this key
    const memories = await getUserMemories('user-sarah');
    const matching = memories.filter((m) => m.memory_key === 'upsert_key');
    expect(matching).toHaveLength(1);

    await deleteMemory('user-sarah', 'upsert_key');
  });

  it('updates the updated_at timestamp on upsert', async () => {
    const first = await saveMemory('user-sarah', 'ts_key', 'v1', 'general');
    // Small delay to get a different timestamp
    await new Promise((r) => setTimeout(r, 50));
    const second = await saveMemory('user-sarah', 'ts_key', 'v2', 'general');
    expect(second.updated_at >= first.updated_at).toBe(true);

    await deleteMemory('user-sarah', 'ts_key');
  });

  it('defaults category to general when not specified', async () => {
    const mem = await saveMemory('user-sarah', 'default_cat', 'test');
    expect(mem.category).toBe('general');

    await deleteMemory('user-sarah', 'default_cat');
  });

  it('returns the saved memory object with all fields', async () => {
    const mem = await saveMemory('user-sarah', 'fields_test', 'val', 'emotional');
    expect(mem).toMatchObject({
      user_id: 'user-sarah',
      memory_key: 'fields_test',
      memory_value: 'val',
      category: 'emotional',
    });
    expect(typeof mem.id).toBe('string');
    expect(typeof mem.created_at).toBe('string');
    expect(typeof mem.updated_at).toBe('string');

    await deleteMemory('user-sarah', 'fields_test');
  });

  it('evicts oldest memory when at 50-memory limit', async () => {
    const db = getDb();
    // Create a user specifically for this test
    await db.execute({
      sql: "INSERT INTO users (id, name, email) VALUES ('user-evict', 'Evict Test', 'evict@test.com')",
      args: [],
    });

    // Insert 50 memories with explicit timestamps
    for (let i = 0; i < 50; i++) {
      const ts = `2026-01-01T${String(i).padStart(2, '0')}:00:00`;
      await db.execute({
        sql: `INSERT INTO user_memory (id, user_id, memory_key, memory_value, category, created_at, updated_at)
              VALUES (?, 'user-evict', ?, ?, 'general', ?, ?)`,
        args: [`mem-evict-${i}`, `key_${String(i).padStart(3, '0')}`, `value_${i}`, ts, ts],
      });
    }

    // Verify 50 exist
    const before = await getUserMemories('user-evict');
    expect(before).toHaveLength(50);

    // Save a 51st — should evict the oldest (key_000 with timestamp 00:00:00)
    await saveMemory('user-evict', 'new_key', 'new_value');

    const after = await getUserMemories('user-evict');
    expect(after).toHaveLength(50);
    expect(after.find((m) => m.memory_key === 'key_000')).toBeUndefined();
    expect(after.find((m) => m.memory_key === 'new_key')).toBeDefined();

    // Clean up
    await db.execute({ sql: "DELETE FROM user_memory WHERE user_id = 'user-evict'", args: [] });
    await db.execute({ sql: "DELETE FROM users WHERE id = 'user-evict'", args: [] });
  });

  it('upsert does NOT trigger eviction (count stays same)', async () => {
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO users (id, name, email) VALUES ('user-noeject', 'No Eject', 'noeject@test.com')",
      args: [],
    });

    // Insert 50 memories
    for (let i = 0; i < 50; i++) {
      await db.execute({
        sql: `INSERT INTO user_memory (id, user_id, memory_key, memory_value, category)
              VALUES (?, 'user-noeject', ?, ?, 'general')`,
        args: [`mem-ne-${i}`, `key_${i}`, `value_${i}`],
      });
    }

    // Upsert an existing key — should NOT evict
    await saveMemory('user-noeject', 'key_0', 'updated_value');

    const after = await getUserMemories('user-noeject');
    expect(after).toHaveLength(50);
    // All original keys still present
    expect(after.find((m) => m.memory_key === 'key_49')).toBeDefined();

    // Clean up
    await db.execute({ sql: "DELETE FROM user_memory WHERE user_id = 'user-noeject'", args: [] });
    await db.execute({ sql: "DELETE FROM users WHERE id = 'user-noeject'", args: [] });
  });
});

describe('deleteMemory', () => {
  it('deletes an existing memory and returns true', async () => {
    await saveMemory('user-sarah', 'delete_me', 'gone soon');
    const result = await deleteMemory('user-sarah', 'delete_me');
    expect(result).toBe(true);

    const memories = await getUserMemories('user-sarah');
    expect(memories.find((m) => m.memory_key === 'delete_me')).toBeUndefined();
  });

  it('returns false when memory does not exist', async () => {
    const result = await deleteMemory('user-sarah', 'nonexistent_key');
    expect(result).toBe(false);
  });
});

describe('cross-user isolation', () => {
  it('user A cannot see user B memories', async () => {
    await saveMemory('user-sarah', 'private_note', 'Sarah secret', 'preference');
    const marcioMemories = await getUserMemories('user-marcio');
    expect(marcioMemories.find((m) => m.memory_key === 'private_note')).toBeUndefined();

    await deleteMemory('user-sarah', 'private_note');
  });

  it('same key for two users creates separate records', async () => {
    await saveMemory('user-sarah', 'shared_key', 'Sarah value', 'context');
    await saveMemory('user-marcio', 'shared_key', 'Marcio value', 'context');

    const sarahMems = await getUserMemories('user-sarah');
    const marcioMems = await getUserMemories('user-marcio');

    const sarahShared = sarahMems.find((m) => m.memory_key === 'shared_key');
    const marcioShared = marcioMems.find((m) => m.memory_key === 'shared_key');

    expect(sarahShared?.memory_value).toBe('Sarah value');
    expect(marcioShared?.memory_value).toBe('Marcio value');

    await deleteMemory('user-sarah', 'shared_key');
    await deleteMemory('user-marcio', 'shared_key');
  });

  it('deleteMemory for user A does not affect user B with same key', async () => {
    await saveMemory('user-sarah', 'delete_isolation', 'Sarah', 'general');
    await saveMemory('user-marcio', 'delete_isolation', 'Marcio', 'general');

    await deleteMemory('user-sarah', 'delete_isolation');

    const marcioMems = await getUserMemories('user-marcio');
    expect(marcioMems.find((m) => m.memory_key === 'delete_isolation')?.memory_value).toBe(
      'Marcio',
    );

    await deleteMemory('user-marcio', 'delete_isolation');
  });
});

describe('unicode support', () => {
  it('handles CJK keys and values', async () => {
    const mem = await saveMemory('user-sarah', '最喜欢的问题', '铁路取消是最重要的', 'preference');
    expect(mem.memory_key).toBe('最喜欢的问题');
    expect(mem.memory_value).toBe('铁路取消是最重要的');

    await deleteMemory('user-sarah', '最喜欢的问题');
  });

  it('handles emoji in values', async () => {
    const mem = await saveMemory('user-sarah', 'mood', 'Feeling great! 🎉✊', 'emotional');
    expect(mem.memory_value).toBe('Feeling great! 🎉✊');

    await deleteMemory('user-sarah', 'mood');
  });
});
