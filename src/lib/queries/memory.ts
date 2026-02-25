import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { UserMemory, MemoryCategory } from '@/types';

const MAX_MEMORIES_PER_USER = 50;

/**
 * Get all memories for a user, ordered by most recently updated.
 */
export async function getUserMemories(userId: string): Promise<UserMemory[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });
  return result.rows as unknown as UserMemory[];
}

/**
 * Upsert a memory: insert if new key, update if the key already exists for this user.
 * If the user already has MAX_MEMORIES_PER_USER and this is a new key, evicts the oldest.
 */
export async function saveMemory(
  userId: string,
  key: string,
  value: string,
  category: MemoryCategory = 'general',
): Promise<UserMemory> {
  const db = getDb();

  // Check if this key already exists (update path — no eviction needed)
  const existing = await db.execute({
    sql: 'SELECT 1 FROM user_memory WHERE user_id = ? AND memory_key = ?',
    args: [userId, key],
  });

  if (existing.rows.length === 0) {
    // New key — enforce limit by evicting oldest if at cap
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ?',
      args: [userId],
    });
    const count = (countResult.rows[0] as unknown as { count: number }).count;
    if (count >= MAX_MEMORIES_PER_USER) {
      await db.execute({
        sql: `DELETE FROM user_memory WHERE id = (
          SELECT id FROM user_memory WHERE user_id = ? ORDER BY updated_at ASC LIMIT 1
        )`,
        args: [userId],
      });
    }
  }

  // Upsert via ON CONFLICT
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO user_memory (id, user_id, memory_key, memory_value, category)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, memory_key)
          DO UPDATE SET memory_value = excluded.memory_value,
                       category = excluded.category,
                       updated_at = CURRENT_TIMESTAMP`,
    args: [id, userId, key, value, category],
  });

  // Return the upserted row
  const result = await db.execute({
    sql: 'SELECT * FROM user_memory WHERE user_id = ? AND memory_key = ?',
    args: [userId, key],
  });
  return result.rows[0] as unknown as UserMemory;
}

/**
 * Delete a specific memory by key for a user. Returns true if deleted, false if not found.
 */
export async function deleteMemory(userId: string, key: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM user_memory WHERE user_id = ? AND memory_key = ?',
    args: [userId, key],
  });
  return result.rowsAffected > 0;
}
