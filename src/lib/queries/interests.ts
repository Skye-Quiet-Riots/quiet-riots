import { getDb } from '../db';
import type { Category } from '@/types';

export async function saveUserInterests(userId: string, categories: string[]): Promise<void> {
  const db = getDb();
  // Replace all interests atomically
  const statements = [
    { sql: 'DELETE FROM user_interests WHERE user_id = ?', args: [userId] },
    ...categories.map((category) => ({
      sql: 'INSERT INTO user_interests (user_id, category) VALUES (?, ?)',
      args: [userId, category],
    })),
  ];
  await db.batch(statements, 'write');
}

export async function getUserInterests(userId: string): Promise<Category[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT category FROM user_interests WHERE user_id = ? ORDER BY category',
    args: [userId],
  });
  return result.rows.map((row) => row.category as Category);
}
